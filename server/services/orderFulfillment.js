// Applies verified Stripe payment results to orders.
// Every function here is idempotent: it is safe to call repeatedly for the same session
// (Stripe retries webhooks, and the confirmation page may also trigger a check).
import { prisma } from '../utils/prisma.js';

function billingFromSession(session) {
  const details = session.customer_details;
  if (!details) return { billingName: null, billingAddress: null };
  return { billingName: details.name || null, billingAddress: details.address ? JSON.stringify(details.address) : null };
}

/**
 * Marks the order for a paid Checkout Session as PAID and decrements inventory exactly once.
 * @returns {Promise<{updated:boolean, order:object|null}>}
 */
export async function markOrderPaid(session) {
  if (session.payment_status !== 'paid') return { updated: false, order: null };

  return prisma.$transaction(async (tx) => {
    const paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id;
    // Conditional update = the idempotency guard. Only one caller can flip UNPAID → PAID.
    const flipped = await tx.order.updateMany({
      where: { stripeSessionId: session.id, paymentStatus: { not: 'PAID' } },
      data: {
        paymentStatus: 'PAID',
        status: 'PAID',
        paidAt: new Date(),
        stripePaymentIntentId: paymentIntentId || null,
        ...billingFromSession(session),
      },
    });

    const order = await tx.order.findUnique({ where: { stripeSessionId: session.id }, include: { items: true } });
    if (!order) {
      console.warn(`[stripe] Paid session ${session.id} has no matching order.`);
      return { updated: false, order: null };
    }
    if (flipped.count === 0) return { updated: false, order };

    if (typeof session.amount_total === 'number' && session.amount_total !== order.total) {
      console.warn(`[stripe] Amount mismatch on ${order.orderNumber}: Stripe ${session.amount_total} vs order ${order.total}`);
    }

    const qtyByProduct = new Map();
    for (const item of order.items) {
      if (item.productId) qtyByProduct.set(item.productId, (qtyByProduct.get(item.productId) || 0) + item.quantity);
    }

    let shortfall = false;
    for (const [productId, qty] of qtyByProduct) {
      const dec = await tx.product.updateMany({
        where: { id: productId, inventory: { gte: qty } },
        data: { inventory: { decrement: qty }, popularity: { increment: qty } },
      });
      if (dec.count === 0) {
        // Stock ran out between checkout and payment — record it so staff can follow up.
        shortfall = true;
        await tx.product.updateMany({ where: { id: productId }, data: { inventory: 0, popularity: { increment: qty } } });
      }
    }
    if (shortfall) {
      await tx.order.update({ where: { id: order.id }, data: { inventoryShortfall: true } });
    }
    return { updated: true, order };
  });
}

export async function markOrderPaymentFailed(session, { expired = false } = {}) {
  const result = await prisma.order.updateMany({
    where: { stripeSessionId: session.id, paymentStatus: { not: 'PAID' } },
    data: { paymentStatus: expired ? 'UNPAID' : 'FAILED', status: 'CANCELLED' },
  });
  return { updated: result.count > 0 };
}
