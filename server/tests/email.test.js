import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import Stripe from 'stripe';
import { startServer, client } from './helpers.js';
import { prisma } from '../utils/prisma.js';
import { generateOrderNumber } from '../utils/orderNumber.js';
import { renderOrderConfirmation } from '../services/email.js';

const stripe = new Stripe('sk_test_signing_only');
const realFetch = globalThis.fetch;
let resendCalls = [];
let resendStatus = 200;
let srv;
let api;

// Intercept only Resend API calls; everything else (the test HTTP client) uses the real fetch.
before(async () => {
  globalThis.fetch = async (url, opts) => {
    if (String(url).startsWith('https://api.resend.com')) {
      resendCalls.push({ url: String(url), headers: opts.headers, body: JSON.parse(opts.body) });
      return new Response(JSON.stringify(resendStatus === 200 ? { id: `email_${resendCalls.length}` } : { message: 'Resend is down' }), { status: resendStatus });
    }
    return realFetch(url, opts);
  };
  srv = await startServer();
  api = client(srv.base);
});
beforeEach(() => {
  resendCalls = [];
  resendStatus = 200;
  process.env.RESEND_API_KEY = 're_test_key';
  process.env.EMAIL_FROM = 'Wakis Mart <orders@example.com>';
});
after(async () => {
  globalThis.fetch = realFetch;
  delete process.env.RESEND_API_KEY;
  delete process.env.EMAIL_FROM;
  await srv.close();
  await prisma.$disconnect();
});

async function paidOrder(sessionId, customerName = 'Ama Mensah', email = 'ama@example.com') {
  const p = await prisma.product.findUnique({ where: { slug: 'ting-grapefruit-soda' } });
  return prisma.order.create({
    data: {
      orderNumber: generateOrderNumber(), customerName, customerEmail: email, fulfillmentMethod: 'PICKUP',
      subtotal: p.price, tax: 56, deliveryFee: 0, total: p.price + 56, stripeSessionId: sessionId,
      items: { create: [{ productId: p.id, productName: p.name, unitPrice: p.price, quantity: 1, lineTotal: p.price }] },
    },
  });
}
async function sendPaidEvent(eventId, sessionId) {
  const payload = JSON.stringify({ id: eventId, object: 'event', type: 'checkout.session.completed', data: { object: { object: 'checkout.session', id: sessionId, payment_status: 'paid' } } });
  const header = stripe.webhooks.generateTestHeaderString({ payload, secret: process.env.STRIPE_WEBHOOK_SECRET });
  return api.post('/api/webhooks/stripe', payload, { 'stripe-signature': header, 'content-type': 'application/json' });
}

test('a paid order sends exactly one confirmation email, even if Stripe repeats the event', async () => {
  const order = await paidOrder('cs_test_email_once');
  await sendPaidEvent('evt_email_1', 'cs_test_email_once');
  await sendPaidEvent('evt_email_1', 'cs_test_email_once'); // duplicate delivery
  await sendPaidEvent('evt_email_2', 'cs_test_email_once'); // different event, same session
  assert.equal(resendCalls.length, 1);
  const { body, headers } = resendCalls[0];
  assert.deepEqual(body.to, ['ama@example.com']);
  assert.equal(body.from, 'Wakis Mart <orders@example.com>');
  assert.match(body.subject, new RegExp(order.orderNumber));
  assert.match(body.html, /Ting Grapefruit Soda/);
  assert.match(body.text, /Total paid/);
  assert.equal(headers.Authorization, 'Bearer re_test_key');
  const saved = await prisma.order.findUnique({ where: { id: order.id } });
  assert.equal(saved.paymentStatus, 'PAID');
  assert.ok(saved.confirmationEmailSentAt);
});

test('if Resend fails, the payment is still recorded and the email is marked unsent', async () => {
  resendStatus = 500;
  const order = await paidOrder('cs_test_email_fail');
  const r = await sendPaidEvent('evt_email_fail', 'cs_test_email_fail');
  assert.equal(r.status, 200);
  const saved = await prisma.order.findUnique({ where: { id: order.id } });
  assert.equal(saved.paymentStatus, 'PAID');
  assert.equal(saved.confirmationEmailSentAt, null);
});

test('no email is attempted when RESEND_API_KEY is not set', async () => {
  delete process.env.RESEND_API_KEY;
  await paidOrder('cs_test_email_off');
  await sendPaidEvent('evt_email_off', 'cs_test_email_off');
  assert.equal(resendCalls.length, 0);
  assert.equal((await api.get('/api/config')).data.email.confirmations, false);
});

test('customer-supplied text is HTML-escaped in the email', async () => {
  const order = await paidOrder('cs_test_email_xss', '<script>alert(1)</script> Kofi');
  const full = await prisma.order.findUnique({ where: { id: order.id }, include: { items: true } });
  const { html } = renderOrderConfirmation(full);
  assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('&lt;script&gt;'));
});

test('admins can resend a confirmation; customers cannot', async () => {
  const order = await paidOrder('cs_test_email_resend', 'Kwame Boateng', 'kwame@example.com');
  await sendPaidEvent('evt_email_resend', 'cs_test_email_resend');
  assert.equal(resendCalls.length, 1);

  const admin = client(srv.base);
  await admin.post('/api/auth/login', { email: 'admin@test.local', password: 'AdminPass123' });
  const r = await admin.post(`/api/admin/orders/${order.id}/resend-confirmation`);
  assert.equal(r.status, 200);
  assert.match(r.data.message, /kwame@example.com/);
  assert.equal(resendCalls.length, 2);
  assert.notEqual(resendCalls[0].headers['Idempotency-Key'], resendCalls[1].headers['Idempotency-Key']);

  assert.equal((await client(srv.base).post(`/api/admin/orders/${order.id}/resend-confirmation`)).status, 401);
});
