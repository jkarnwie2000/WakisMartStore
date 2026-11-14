import { z } from 'zod';
import { prisma } from '../utils/prisma.js';
import { env } from '../config/env.js';
import { resolveCart, computeTotals } from '../services/pricing.js';
import { getStripe } from '../services/stripe.js';
import { getStoreSettings } from '../services/settings.js';
import { generateOrderNumber } from '../utils/orderNumber.js';
import { badRequest, conflict, HttpError } from '../utils/httpError.js';
import { MAX_QTY_PER_LINE } from '../utils/constants.js';

const itemSchema = z.object({
  productId: z.coerce.number().int().positive(),
  portionId: z.coerce.number().int().positive().nullable().optional(),
  quantity: z.coerce.number().int().min(1).max(MAX_QTY_PER_LINE),
});
export const cartSchema = z.object({ items: z.array(itemSchema).max(100) });

const addressSchema = z.object({
  line1: z.string().trim().min(3, 'Street address is required.').max(120),
  line2: z.string().trim().max(120).optional().or(z.literal('')),
  city: z.string().trim().min(2, 'City is required.').max(80),
  state: z.string().trim().min(2, 'State / region is required.').max(80),
  postalCode: z.string().trim().min(3, 'Postal code is required.').max(20),
});

const checkoutSchema = z
  .object({
    items: z.array(itemSchema).min(1, 'Your cart is empty.').max(100),
    customer: z.object({
      name: z.string().trim().min(2, 'Please enter your full name.').max(100),
      email: z.string().trim().toLowerCase().email('Please enter a valid email address.').max(160),
      phone: z.string().trim().max(30).regex(/^[0-9+()\-.\s]*$/, 'Please enter a valid phone number.').optional().or(z.literal('')),
    }),
    fulfillment: z.object({
      method: z.enum(['DELIVERY', 'PICKUP']),
      address: addressSchema.optional(),
    }),
    notes: z.string().trim().max(500).optional().or(z.literal('')),
  })
  .superRefine((val, ctx) => {
    if (val.fulfillment.method === 'DELIVERY' && !val.fulfillment.address) {
      ctx.addIssue({ code: 'custom', path: ['fulfillment', 'address'], message: 'A delivery address is required for home delivery.' });
    }
  });

const quoteSchema = z.object({
  items: z.array(itemSchema).max(100),
  fulfillmentMethod: z.enum(['DELIVERY', 'PICKUP']).optional(),
});

function assertMethodEnabled(method, settings) {
  if (method === 'DELIVERY' && !settings.delivery.enabled) throw badRequest('Home delivery is not currently available.');
  if (method === 'PICKUP' && !settings.pickup.enabled) throw badRequest('Store pickup is not currently available.');
}

/** POST /api/cart/validate — refreshes cart lines with live prices and stock. */
export async function validateCart(req, res) {
  const { items } = cartSchema.parse(req.body);
  const { lines, issues } = await resolveCart(items);
  res.json({ lines, issues, totals: computeTotals(lines, 'PICKUP', await getStoreSettings()) });
}

/** POST /api/checkout/quote — totals for the checkout summary (no order is created). */
export async function quote(req, res) {
  const { items, fulfillmentMethod = 'PICKUP' } = quoteSchema.parse(req.body);
  const { lines, issues } = await resolveCart(items);
  res.json({ lines, issues, totals: computeTotals(lines, fulfillmentMethod, await getStoreSettings()) });
}

/** POST /api/checkout/session — creates a PENDING order and a Stripe Checkout Session for it. */
export async function createCheckoutSession(req, res) {
  const body = checkoutSchema.parse(req.body);
  const settings = await getStoreSettings();
  assertMethodEnabled(body.fulfillment.method, settings);
  const stripe = getStripe(); // throws 503 if Stripe keys are missing

  const { lines, issues } = await resolveCart(body.items);
  // Any problem (price changes are fine — stock / availability are not) blocks payment so
  // the customer can review the corrected cart before paying.
  if (issues.length > 0) {
    throw conflict('Some items in your cart changed. Please review your cart before paying.', { issues, lines });
  }
  if (lines.length === 0) throw badRequest('Your cart is empty.');

  const totals = computeTotals(lines, body.fulfillment.method, settings);
  const address = body.fulfillment.method === 'DELIVERY' ? body.fulfillment.address : null;

  const order = await prisma.order.create({
    data: {
      orderNumber: generateOrderNumber(),
      userId: req.user?.id ?? null,
      customerName: body.customer.name,
      customerEmail: body.customer.email,
      customerPhone: body.customer.phone || null,
      fulfillmentMethod: body.fulfillment.method,
      shippingLine1: address?.line1 ?? null,
      shippingLine2: address?.line2 || null,
      shippingCity: address?.city ?? null,
      shippingState: address?.state ?? null,
      shippingPostalCode: address?.postalCode ?? null,
      notes: body.notes || null,
      subtotal: totals.subtotal,
      tax: totals.tax,
      deliveryFee: totals.deliveryFee,
      total: totals.total,
      currency: totals.currency,
      items: {
        create: lines.map((l) => ({
          productId: l.productId,
          productName: l.name,
          portionLabel: l.portionLabel,
          image: l.image,
          sku: l.sku,
          unitPrice: l.unitPrice,
          quantity: l.quantity,
          lineTotal: l.lineTotal,
        })),
      },
    },
  });

  const lineItems = lines.map((l) => ({
    quantity: l.quantity,
    price_data: {
      currency: totals.currency,
      unit_amount: l.unitPrice,
      product_data: {
        name: l.portionLabel ? `${l.name} — ${l.portionLabel}` : l.name,
        metadata: { productId: String(l.productId), sku: l.sku },
      },
    },
  }));
  if (totals.deliveryFee > 0) {
    lineItems.push({ quantity: 1, price_data: { currency: totals.currency, unit_amount: totals.deliveryFee, product_data: { name: 'Home delivery' } } });
  }
  if (totals.tax > 0) {
    lineItems.push({
      quantity: 1,
      price_data: { currency: totals.currency, unit_amount: totals.tax, product_data: { name: `Sales tax (${(totals.taxRate * 100).toFixed(2).replace(/\.?0+$/, '')}%)` } },
    });
  }

  let session;
  try {
    session = await stripe.checkout.sessions.create(
      {
        mode: 'payment',
        line_items: lineItems,
        customer_email: body.customer.email,
        client_reference_id: order.orderNumber,
        billing_address_collection: 'required',
        metadata: { orderId: String(order.id), orderNumber: order.orderNumber },
        payment_intent_data: {
          description: `Wakis Mart order ${order.orderNumber}`,
          metadata: { orderId: String(order.id), orderNumber: order.orderNumber },
        },
        success_url: `${env.clientUrl}/order-confirmation?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${env.clientUrl}/checkout?cancelled=1&order=${encodeURIComponent(order.orderNumber)}`,
        expires_at: Math.floor(Date.now() / 1000) + 60 * 60, // 1 hour
      },
      { idempotencyKey: `wakis-order-${order.id}` },
    );
  } catch (err) {
    await prisma.order.update({ where: { id: order.id }, data: { status: 'CANCELLED', paymentStatus: 'FAILED' } });
    console.error('[stripe] Failed to create Checkout Session:', err.message);
    throw new HttpError(502, 'We could not connect to our payment provider. Please try again in a moment.');
  }

  // Sanity check: Stripe's computed total must match ours.
  if (session.amount_total != null && session.amount_total !== totals.total) {
    console.warn(`[stripe] Session total ${session.amount_total} differs from order total ${totals.total}`);
  }

  await prisma.order.update({ where: { id: order.id }, data: { stripeSessionId: session.id } });
  res.status(201).json({ url: session.url, sessionId: session.id, orderNumber: order.orderNumber });
}

/** POST /api/checkout/cancel — called when a shopper returns from Stripe via the cancel URL. */
export async function cancelPendingOrder(req, res) {
  const { orderNumber } = z.object({ orderNumber: z.string().trim().min(5).max(40) }).parse(req.body);
  const order = await prisma.order.findUnique({ where: { orderNumber } });
  if (!order || order.paymentStatus === 'PAID' || order.status !== 'PENDING') return res.json({ cancelled: false });

  // Expire the Stripe session so it can no longer be paid, then cancel the order.
  if (order.stripeSessionId) {
    try {
      const stripe = getStripe();
      const session = await stripe.checkout.sessions.retrieve(order.stripeSessionId);
      if (session.status === 'complete') return res.json({ cancelled: false }); // already paid — webhook will finalise
      if (session.status === 'open') await stripe.checkout.sessions.expire(order.stripeSessionId);
    } catch (err) {
      console.warn('[stripe] Could not expire session on cancel:', err.message);
      return res.json({ cancelled: false });
    }
  }
  await prisma.order.updateMany({ where: { id: order.id, paymentStatus: { not: 'PAID' } }, data: { status: 'CANCELLED' } });
  res.json({ cancelled: true });
}
