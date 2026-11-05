import { prisma } from '../utils/prisma.js';
import { constructWebhookEvent } from '../services/stripe.js';
import { markOrderPaid, markOrderPaymentFailed } from '../services/orderFulfillment.js';

/**
 * POST /api/webhooks/stripe
 * Must receive the RAW request body (mounted with express.raw before express.json).
 */
export async function stripeWebhook(req, res) {
  const signature = req.headers['stripe-signature'];
  if (!signature) return res.status(400).json({ error: 'Missing Stripe-Signature header.' });

  let event;
  try {
    event = constructWebhookEvent(req.body, signature);
  } catch (err) {
    if (err.status === 503) return res.status(503).json({ error: err.message });
    console.warn('[stripe] Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: 'Invalid signature.' });
  }

  // Skip events we've already processed (Stripe may deliver the same event more than once).
  const seen = await prisma.processedStripeEvent.findUnique({ where: { id: event.id } });
  if (seen) return res.json({ received: true, duplicate: true });

  const session = event.data.object;
  switch (event.type) {
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded': {
      // For delayed payment methods, `completed` arrives with payment_status "unpaid";
      // the order then stays PENDING until async_payment_succeeded.
      const { updated, order } = await markOrderPaid(session);
      if (updated) console.log(`[stripe] Order ${order.orderNumber} paid.`);
      break;
    }
    case 'checkout.session.async_payment_failed':
      await markOrderPaymentFailed(session);
      break;
    case 'checkout.session.expired':
      await markOrderPaymentFailed(session, { expired: true });
      break;
    default:
      // Unhandled event types are acknowledged so Stripe doesn't retry them.
      break;
  }

  try {
    await prisma.processedStripeEvent.create({ data: { id: event.id, type: event.type } });
  } catch (err) {
    if (err.code !== 'P2002') throw err; // concurrent duplicate delivery — already recorded
  }
  res.json({ received: true });
}
