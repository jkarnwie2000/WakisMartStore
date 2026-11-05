import { prisma } from '../utils/prisma.js';
import { serializeOrder } from '../utils/serializers.js';
import { notFound, badRequest } from '../utils/httpError.js';
import { stripeConfigured } from '../config/env.js';
import { getStripe } from '../services/stripe.js';
import { markOrderPaid } from '../services/orderFulfillment.js';

const includeItems = { items: { include: { product: { select: { slug: true } } } } };

/**
 * GET /api/orders/confirmation/:sessionId
 * Used by the order confirmation page after Stripe redirects back.
 * If the webhook hasn't arrived yet, we ask Stripe directly (server-to-server, so the
 * result is trustworthy) and apply the same idempotent fulfilment logic.
 */
export async function getConfirmation(req, res) {
  const sessionId = req.params.sessionId;
  if (!/^cs_(test|live)_[A-Za-z0-9_]{1,250}$/.test(sessionId)) throw badRequest('Invalid checkout session.');

  let order = await prisma.order.findUnique({ where: { stripeSessionId: sessionId }, include: includeItems });
  if (!order) throw notFound('We could not find an order for this checkout session.');

  if (order.paymentStatus !== 'PAID' && stripeConfigured()) {
    try {
      const session = await getStripe().checkout.sessions.retrieve(sessionId);
      if (session.payment_status === 'paid') {
        await markOrderPaid(session);
        order = await prisma.order.findUnique({ where: { id: order.id }, include: includeItems });
      }
    } catch (err) {
      console.warn('[stripe] Could not verify session on confirmation page:', err.message);
    }
  }
  res.json({ order: serializeOrder(order) });
}

export async function myOrders(req, res) {
  const orders = await prisma.order.findMany({
    where: { userId: req.user.id, stripeSessionId: { not: null } },
    include: includeItems,
    orderBy: { createdAt: 'desc' },
  });
  res.json({ orders: orders.map((o) => serializeOrder(o)) });
}

export async function myOrder(req, res) {
  const order = await prisma.order.findFirst({
    where: { userId: req.user.id, orderNumber: req.params.orderNumber },
    include: includeItems,
  });
  if (!order) throw notFound('Order not found.');
  res.json({ order: serializeOrder(order) });
}
