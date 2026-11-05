import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import Stripe from 'stripe';
import { startServer, client } from './helpers.js';
import { prisma } from '../utils/prisma.js';
import { generateOrderNumber } from '../utils/orderNumber.js';

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const stripe = new Stripe('sk_test_signing_only');
let srv;
let api;

before(async () => {
  srv = await startServer();
  api = client(srv.base);
});
after(async () => {
  await srv.close();
  await prisma.$disconnect();
});

const product = (slug) => prisma.product.findUnique({ where: { slug }, include: { portions: true } });

/** Sends a correctly signed Stripe webhook event to the server. */
async function sendEvent(event, { secret = WEBHOOK_SECRET } = {}) {
  const payload = JSON.stringify(event);
  const header = stripe.webhooks.generateTestHeaderString({ payload, secret });
  return api.post('/api/webhooks/stripe', payload, { 'stripe-signature': header, 'content-type': 'application/json' });
}

const sessionEvent = (id, type, session) => ({ id, object: 'event', type, data: { object: { object: 'checkout.session', ...session } } });

/** Creates a PENDING order the same way the checkout controller does (minus the Stripe call). */
async function createPendingOrder(lines, sessionId) {
  const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
  return prisma.order.create({
    data: {
      orderNumber: generateOrderNumber(),
      customerName: 'Test Customer',
      customerEmail: 'test@example.com',
      fulfillmentMethod: 'PICKUP',
      subtotal,
      tax: Math.round(subtotal * 0.07),
      deliveryFee: 0,
      total: subtotal + Math.round(subtotal * 0.07),
      stripeSessionId: sessionId,
      items: { create: lines.map((l) => ({ productId: l.productId, productName: l.name, unitPrice: l.unitPrice, quantity: l.quantity, lineTotal: l.unitPrice * l.quantity })) },
    },
  });
}

test('cart validation re-prices from the database and ignores client prices', async () => {
  const rice = await product('royal-stallion-parboiled-long-grain-rice');
  const r = await api.post('/api/cart/validate', { items: [{ productId: rice.id, quantity: 2, unitPrice: 1 }] });
  assert.equal(r.status, 200);
  assert.equal(r.data.lines[0].unitPrice, rice.price);
  assert.equal(r.data.totals.subtotal, rice.price * 2);
});

test('quantities are clamped to available inventory (shared across portions)', async () => {
  const jollof = await product('party-jollof-rice');
  const [small, large] = jollof.portions;
  const r = await api.post('/api/cart/validate', {
    items: [
      { productId: jollof.id, portionId: small.id, quantity: jollof.inventory },
      { productId: jollof.id, portionId: large.id, quantity: 5 },
    ],
  });
  const total = r.data.lines.reduce((n, l) => n + l.quantity, 0);
  assert.ok(total <= jollof.inventory);
  assert.ok(r.data.issues.some((i) => i.type === 'OUT_OF_STOCK' || i.type === 'INSUFFICIENT_STOCK'));
});

test('deli items require a valid portion; sold-out items are rejected', async () => {
  const jollof = await product('party-jollof-rice');
  const r = await api.post('/api/cart/validate', { items: [{ productId: jollof.id, quantity: 1 }] });
  assert.equal(r.data.issues[0].type, 'INVALID_PORTION');
  const soldOut = await prisma.product.findFirst({ where: { inventory: 0 } });
  const r2 = await api.post('/api/cart/validate', { items: [{ productId: soldOut.id, portionId: null, quantity: 1 }] });
  assert.ok(['OUT_OF_STOCK', 'INVALID_PORTION'].includes(r2.data.issues[0].type));
});

test('quote calculates tax and delivery fee (free over threshold) on the server', async () => {
  const sauce = await product('west-indian-hot-pepper-sauce'); // $4.99
  const small = await api.post('/api/checkout/quote', { items: [{ productId: sauce.id, quantity: 2 }], fulfillmentMethod: 'DELIVERY' });
  assert.equal(small.data.totals.subtotal, 998);
  assert.equal(small.data.totals.tax, Math.round(998 * 0.07));
  assert.equal(small.data.totals.deliveryFee, 799);
  assert.equal(small.data.totals.total, 998 + 70 + 799);
  const pickup = await api.post('/api/checkout/quote', { items: [{ productId: sauce.id, quantity: 2 }], fulfillmentMethod: 'PICKUP' });
  assert.equal(pickup.data.totals.deliveryFee, 0);
  const rice = await product('royal-stallion-parboiled-long-grain-rice'); // $32.99 × 3 > $75
  const big = await api.post('/api/checkout/quote', { items: [{ productId: rice.id, quantity: 3 }], fulfillmentMethod: 'DELIVERY' });
  assert.equal(big.data.totals.deliveryFee, 0);
});

test('checkout validates customer details and requires an address for delivery', async () => {
  const sauce = await product('west-indian-hot-pepper-sauce');
  const bad = await api.post('/api/checkout/session', { items: [{ productId: sauce.id, quantity: 1 }], customer: { name: 'A', email: 'nope' }, fulfillment: { method: 'PICKUP' } });
  assert.equal(bad.status, 400);
  assert.ok(bad.data.details.some((d) => d.field === 'customer.email'));
  const noAddr = await api.post('/api/checkout/session', { items: [{ productId: sauce.id, quantity: 1 }], customer: { name: 'Ada Obi', email: 'ada@example.com' }, fulfillment: { method: 'DELIVERY' } });
  assert.equal(noAddr.status, 400);
  assert.ok(noAddr.data.details.some((d) => d.field === 'fulfillment.address'));
});

test('checkout returns 503 (no fake payment) when Stripe is not configured', async () => {
  const sauce = await product('west-indian-hot-pepper-sauce');
  const r = await api.post('/api/checkout/session', { items: [{ productId: sauce.id, quantity: 1 }], customer: { name: 'Ada Obi', email: 'ada@example.com' }, fulfillment: { method: 'PICKUP' } });
  assert.equal(r.status, 503);
  assert.match(r.data.error, /not configured/i);
});

test('webhook rejects missing and invalid signatures', async () => {
  const event = sessionEvent('evt_bad', 'checkout.session.completed', { id: 'cs_test_bad', payment_status: 'paid' });
  const missing = await api.post('/api/webhooks/stripe', JSON.stringify(event), { 'content-type': 'application/json' });
  assert.equal(missing.status, 400);
  const forged = await sendEvent(event, { secret: 'whsec_wrong_secret' });
  assert.equal(forged.status, 400);
});

test('verified payment marks order paid, reduces inventory once, and is idempotent', async () => {
  const sauce = await product('calypso-sauce');
  const jollof = await product('party-jollof-rice');
  await prisma.product.update({ where: { id: sauce.id }, data: { inventory: 20 } });
  const sessionId = 'cs_test_paid_order_1';
  const order = await createPendingOrder(
    [
      { productId: sauce.id, name: sauce.name, unitPrice: sauce.price, quantity: 3 },
      { productId: jollof.id, name: jollof.name, unitPrice: jollof.portions[0].price, quantity: 2 },
    ],
    sessionId,
  );
  const before = { sauce: 20, jollof: jollof.inventory, pop: (await product('calypso-sauce')).popularity };

  // Not paid yet → confirmation shows pending
  const pending = await api.get(`/api/orders/confirmation/${sessionId}`);
  assert.equal(pending.data.order.paymentStatus, 'UNPAID');

  const session = { id: sessionId, payment_status: 'paid', amount_total: order.total, payment_intent: 'pi_test_123', customer_details: { name: 'Test Customer', address: { line1: '1 Test St', city: 'Testville', country: 'US' } } };
  const r1 = await sendEvent(sessionEvent('evt_paid_1', 'checkout.session.completed', session));
  assert.equal(r1.status, 200);

  const paid = await prisma.order.findUnique({ where: { id: order.id } });
  assert.equal(paid.paymentStatus, 'PAID');
  assert.equal(paid.status, 'PAID');
  assert.equal(paid.stripePaymentIntentId, 'pi_test_123');
  assert.equal(paid.billingName, 'Test Customer');
  assert.equal((await product('calypso-sauce')).inventory, before.sauce - 3);
  assert.equal((await product('party-jollof-rice')).inventory, before.jollof - 2);
  assert.equal((await product('calypso-sauce')).popularity, before.pop + 3);

  // Same event delivered again → acknowledged as duplicate, no second decrement
  const r2 = await sendEvent(sessionEvent('evt_paid_1', 'checkout.session.completed', session));
  assert.equal(r2.data.duplicate, true);
  // A different event for the same session (e.g. async_payment_succeeded) → still no double decrement
  await sendEvent(sessionEvent('evt_paid_2', 'checkout.session.async_payment_succeeded', session));
  assert.equal((await product('calypso-sauce')).inventory, before.sauce - 3);

  const confirmation = await api.get(`/api/orders/confirmation/${sessionId}`);
  assert.equal(confirmation.data.order.paymentStatus, 'PAID');
  assert.equal(confirmation.data.order.items.length, 2);
});

test('unpaid "completed" sessions (delayed payment methods) stay pending', async () => {
  const sauce = await product('pickapeppa-sauce-original');
  const sessionId = 'cs_test_async_pending';
  await createPendingOrder([{ productId: sauce.id, name: sauce.name, unitPrice: sauce.price, quantity: 1 }], sessionId);
  await sendEvent(sessionEvent('evt_async_1', 'checkout.session.completed', { id: sessionId, payment_status: 'unpaid' }));
  const o = await prisma.order.findUnique({ where: { stripeSessionId: sessionId } });
  assert.equal(o.paymentStatus, 'UNPAID');
  assert.equal(o.status, 'PENDING');
  await sendEvent(sessionEvent('evt_async_2', 'checkout.session.async_payment_failed', { id: sessionId, payment_status: 'unpaid' }));
  const failed = await prisma.order.findUnique({ where: { stripeSessionId: sessionId } });
  assert.equal(failed.paymentStatus, 'FAILED');
  assert.equal(failed.status, 'CANCELLED');
});

test('expired sessions cancel the pending order without touching inventory', async () => {
  const sauce = await product('spicy-jerk-sauce');
  const sessionId = 'cs_test_expired';
  await createPendingOrder([{ productId: sauce.id, name: sauce.name, unitPrice: sauce.price, quantity: 1 }], sessionId);
  await sendEvent(sessionEvent('evt_expired_1', 'checkout.session.expired', { id: sessionId, payment_status: 'unpaid' }));
  const o = await prisma.order.findUnique({ where: { stripeSessionId: sessionId } });
  assert.equal(o.status, 'CANCELLED');
  assert.equal((await product('spicy-jerk-sauce')).inventory, sauce.inventory);
});

test('stock shortfall between checkout and payment is flagged, inventory never negative', async () => {
  const p = await product('mauby-bark');
  await prisma.product.update({ where: { id: p.id }, data: { inventory: 1 } });
  const sessionId = 'cs_test_shortfall';
  await createPendingOrder([{ productId: p.id, name: p.name, unitPrice: p.price, quantity: 3 }], sessionId);
  await sendEvent(sessionEvent('evt_short_1', 'checkout.session.completed', { id: sessionId, payment_status: 'paid' }));
  const o = await prisma.order.findUnique({ where: { stripeSessionId: sessionId } });
  assert.equal(o.paymentStatus, 'PAID');
  assert.equal(o.inventoryShortfall, true);
  assert.equal((await product('mauby-bark')).inventory, 0);
});
