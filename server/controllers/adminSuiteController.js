// Admin dashboard: reports, fulfilment, refunds, store settings, inventory, customers, specials, activity, exports.
import { z } from 'zod';
import { prisma } from '../utils/prisma.js';
import { serializeOrder, serializeProduct } from '../utils/serializers.js';
import { badRequest, notFound, HttpError } from '../utils/httpError.js';
import { LOW_STOCK_THRESHOLD } from '../utils/constants.js';
import { toCsv, sendCsv, parseCsv } from '../utils/csv.js';
import { getStripe } from '../services/stripe.js';
import { getStoreSettings, clearSettingsCache } from '../services/settings.js';
import { applySpecial, endSpecials, expireSpecials } from '../services/specials.js';
import { logActivity } from '../services/activity.js';

const DAY = 24 * 60 * 60 * 1000;
const dollars = (cents) => (cents / 100).toFixed(2);
const idParam = (req) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) throw badRequest('Invalid id.');
  return id;
};
const startOfTodayUtc = () => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

// ── Dashboard "today" snapshot ──────────────────────────────
export async function overview(_req, res) {
  const today = startOfTodayUtc();
  const [todayAgg, toPack, ready, outForDelivery, outOfStock, lowStock, specials] = await Promise.all([
    prisma.order.aggregate({ where: { paymentStatus: 'PAID', paidAt: { gte: today } }, _sum: { total: true }, _count: { _all: true } }),
    prisma.order.count({ where: { paymentStatus: 'PAID', status: { in: ['PAID', 'PROCESSING'] } } }),
    prisma.order.count({ where: { paymentStatus: 'PAID', status: 'READY_FOR_PICKUP' } }),
    prisma.order.count({ where: { paymentStatus: 'PAID', status: 'OUT_FOR_DELIVERY' } }),
    prisma.product.count({ where: { isActive: true, inventory: 0 } }),
    prisma.product.count({ where: { isActive: true, inventory: { gt: 0, lte: LOW_STOCK_THRESHOLD } } }),
    prisma.product.count({ where: { compareAtPrice: { not: null } } }),
  ]);
  res.json({
    today: { revenue: todayAgg._sum.total || 0, orders: todayAgg._count._all },
    fulfilment: { toPack, readyForPickup: ready, outForDelivery },
    inventory: { outOfStock, lowStock },
    specials: { active: specials },
  });
}

// ── Sales reports ───────────────────────────────────────────
const RANGES = { '7d': [7, 'day'], '30d': [30, 'day'], '90d': [90, 'week'], '12m': [365, 'month'] };
const rangeSchema = z.object({ range: z.enum(Object.keys(RANGES)).default('30d') });

function bucketKey(date, group) {
  const d = new Date(date);
  if (group === 'month') return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  if (group === 'week') {
    const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - ((d.getUTCDay() + 6) % 7)));
    return monday.toISOString().slice(0, 10);
  }
  return d.toISOString().slice(0, 10);
}

function buildBuckets(days, group) {
  const keys = [];
  const end = new Date();
  for (let t = end.getTime() - (days - 1) * DAY; t <= end.getTime(); t += DAY) {
    const k = bucketKey(t, group);
    if (keys[keys.length - 1] !== k) keys.push(k);
  }
  return keys;
}

async function paidOrdersInRange(range) {
  const [days] = RANGES[range];
  const since = new Date(Date.now() - days * DAY);
  since.setUTCHours(0, 0, 0, 0);
  return prisma.order.findMany({
    where: { paymentStatus: { in: ['PAID', 'REFUNDED'] }, paidAt: { gte: since } },
    include: { items: { include: { product: { select: { category: { select: { name: true } } } } } } },
    orderBy: { paidAt: 'asc' },
  });
}

export async function salesReport(req, res) {
  const { range } = rangeSchema.parse(req.query);
  const [days, group] = RANGES[range];
  const orders = await paidOrdersInRange(range);

  const series = new Map(buildBuckets(days, group).map((k) => [k, { period: k, revenue: 0, orders: 0 }]));
  const departments = new Map();
  const products = new Map();
  const fulfilment = { DELIVERY: { orders: 0, revenue: 0 }, PICKUP: { orders: 0, revenue: 0 } };
  const totals = { revenue: 0, refunds: 0, orders: 0, items: 0, tax: 0, deliveryFees: 0 };

  for (const o of orders) {
    const net = o.total - o.refundedAmount;
    const b = series.get(bucketKey(o.paidAt, group));
    if (b) {
      b.revenue += net;
      b.orders += 1;
    }
    totals.revenue += net;
    totals.refunds += o.refundedAmount;
    totals.orders += 1;
    totals.tax += o.tax;
    totals.deliveryFees += o.deliveryFee;
    fulfilment[o.fulfillmentMethod].orders += 1;
    fulfilment[o.fulfillmentMethod].revenue += net;
    for (const i of o.items) {
      totals.items += i.quantity;
      const dep = i.product?.category?.name || 'Removed products';
      const d = departments.get(dep) || { department: dep, revenue: 0, units: 0 };
      d.revenue += i.lineTotal;
      d.units += i.quantity;
      departments.set(dep, d);
      const key = i.productName;
      const p = products.get(key) || { name: key, revenue: 0, units: 0 };
      p.revenue += i.lineTotal;
      p.units += i.quantity;
      products.set(key, p);
    }
  }

  // Worst sellers = active, non-deli products with zero or the fewest sales in the range.
  const soldNames = new Set(products.keys());
  const unsold = await prisma.product.findMany({
    where: { isActive: true, isDeli: false, name: { notIn: [...soldNames] } },
    select: { name: true, inventory: true, category: { select: { name: true } } },
    orderBy: { name: 'asc' },
    take: 10,
  });
  const ranked = [...products.values()].sort((a, b) => b.revenue - a.revenue);
  res.json({
    range,
    group,
    totals: { ...totals, averageOrder: totals.orders ? Math.round(totals.revenue / totals.orders) : 0 },
    series: [...series.values()],
    departments: [...departments.values()].sort((a, b) => b.revenue - a.revenue),
    bestSellers: ranked.slice(0, 10),
    slowSellers: [...ranked.slice(-5).reverse().filter((p) => !ranked.slice(0, 10).includes(p))],
    unsold: unsold.map((u) => ({ name: u.name, department: u.category.name, inventory: u.inventory })),
    fulfilment,
  });
}

// ── CSV exports ─────────────────────────────────────────────
export async function exportOrders(req, res) {
  const { range } = rangeSchema.parse(req.query);
  const [days] = RANGES[range];
  const orders = await prisma.order.findMany({
    where: { stripeSessionId: { not: null }, createdAt: { gte: new Date(Date.now() - days * DAY) } },
    include: { items: true },
    orderBy: { createdAt: 'desc' },
  });
  const csv = toCsv(orders, [
    ['Order number', 'orderNumber'],
    ['Placed (UTC)', (o) => o.createdAt],
    ['Paid (UTC)', (o) => o.paidAt],
    ['Customer', 'customerName'],
    ['Email', 'customerEmail'],
    ['Phone', 'customerPhone'],
    ['Fulfilment', 'fulfillmentMethod'],
    ['Order status', 'status'],
    ['Payment status', 'paymentStatus'],
    ['Items', (o) => o.items.map((i) => `${i.quantity}x ${i.productName}${i.portionLabel ? ` (${i.portionLabel})` : ''}`).join('; ')],
    ['Subtotal', (o) => dollars(o.subtotal)],
    ['Tax', (o) => dollars(o.tax)],
    ['Delivery fee', (o) => dollars(o.deliveryFee)],
    ['Total', (o) => dollars(o.total)],
    ['Refunded', (o) => dollars(o.refundedAmount)],
  ]);
  sendCsv(res, `wakis-mart-orders-${range}.csv`, csv);
}

export async function exportSales(req, res) {
  const { range } = rangeSchema.parse(req.query);
  const [days, group] = RANGES[range];
  const orders = await paidOrdersInRange(range);
  const series = new Map(buildBuckets(days, group).map((k) => [k, { period: k, revenue: 0, orders: 0 }]));
  for (const o of orders) {
    const b = series.get(bucketKey(o.paidAt, group));
    if (b) {
      b.revenue += o.total - o.refundedAmount;
      b.orders += 1;
    }
  }
  const csv = toCsv([...series.values()], [
    [group === 'day' ? 'Date' : group === 'week' ? 'Week starting' : 'Month', 'period'],
    ['Orders', 'orders'],
    ['Net revenue', (r) => dollars(r.revenue)],
  ]);
  sendCsv(res, `wakis-mart-sales-${range}.csv`, csv);
}

export async function exportProducts(_req, res) {
  const products = await prisma.product.findMany({ include: { category: true }, orderBy: [{ categoryId: 'asc' }, { name: 'asc' }] });
  const csv = toCsv(products, [
    ['sku', 'sku'],
    ['name', 'name'],
    ['department', (p) => p.category.name],
    ['type', 'subcategory'],
    ['brand', 'brand'],
    ['price', (p) => dollars(p.price)],
    ['regular_price', (p) => (p.compareAtPrice ? dollars(p.compareAtPrice) : '')],
    ['inventory', 'inventory'],
    ['active', (p) => (p.isActive ? 'yes' : 'no')],
    ['featured', (p) => (p.featured ? 'yes' : 'no')],
  ]);
  sendCsv(res, 'wakis-mart-products.csv', csv);
}

export async function exportCustomers(_req, res) {
  const customers = await customerRows();
  const csv = toCsv(customers, [
    ['Name', 'name'],
    ['Email', 'email'],
    ['Account', (c) => (c.hasAccount ? 'Registered' : 'Guest')],
    ['Paid orders', 'orders'],
    ['Total spent', (c) => dollars(c.totalSpent)],
    ['First order (UTC)', 'firstOrderAt'],
    ['Last order (UTC)', 'lastOrderAt'],
  ]);
  sendCsv(res, 'wakis-mart-customers.csv', csv);
}

// ── Fulfilment board ────────────────────────────────────────
export async function fulfilmentBoard(_req, res) {
  const include = { items: true };
  const [toPack, readyForPickup, outForDelivery, completedToday] = await Promise.all([
    prisma.order.findMany({ where: { paymentStatus: 'PAID', status: { in: ['PAID', 'PROCESSING'] } }, include, orderBy: { paidAt: 'asc' } }),
    prisma.order.findMany({ where: { paymentStatus: 'PAID', status: 'READY_FOR_PICKUP' }, include, orderBy: { updatedAt: 'asc' } }),
    prisma.order.findMany({ where: { paymentStatus: 'PAID', status: 'OUT_FOR_DELIVERY' }, include, orderBy: { updatedAt: 'asc' } }),
    prisma.order.count({ where: { status: 'COMPLETED', updatedAt: { gte: startOfTodayUtc() } } }),
  ]);
  const s = (list) => list.map((o) => serializeOrder(o, { admin: true }));
  res.json({ toPack: s(toPack), readyForPickup: s(readyForPickup), outForDelivery: s(outForDelivery), completedToday });
}

export async function pickList(_req, res) {
  const orders = await prisma.order.findMany({
    where: { paymentStatus: 'PAID', status: { in: ['PAID', 'PROCESSING'] } },
    include: { items: { include: { product: { select: { category: { select: { name: true } } } } } } },
    orderBy: { paidAt: 'asc' },
  });
  const lines = new Map();
  for (const o of orders) {
    for (const i of o.items) {
      const key = `${i.productId ?? i.productName}:${i.portionLabel ?? ''}`;
      const l = lines.get(key) || { name: i.productName, portion: i.portionLabel, sku: i.sku, department: i.product?.category?.name || '—', quantity: 0, orders: [] };
      l.quantity += i.quantity;
      l.orders.push(`${o.orderNumber} ×${i.quantity}`);
      lines.set(key, l);
    }
  }
  res.json({
    generatedAt: new Date(),
    orderCount: orders.length,
    orders: orders.map((o) => ({ orderNumber: o.orderNumber, customerName: o.customerName, fulfillmentMethod: o.fulfillmentMethod })),
    lines: [...lines.values()].sort((a, b) => a.department.localeCompare(b.department) || a.name.localeCompare(b.name)),
  });
}

// ── Stripe refunds ──────────────────────────────────────────
const refundSchema = z.object({
  amount: z.coerce.number().positive().max(100000).optional(), // dollars; omit for the full remaining amount
  restock: z.boolean().optional().default(false),
  reason: z.string().trim().max(300).optional().or(z.literal('')),
});

export async function refundOrder(req, res) {
  const id = idParam(req);
  const body = refundSchema.parse(req.body ?? {});
  const order = await prisma.order.findUnique({ where: { id }, include: { items: true } });
  if (!order) throw notFound('Order not found.');
  if (order.paymentStatus !== 'PAID') throw badRequest('Only paid orders can be refunded.');
  if (!order.stripePaymentIntentId) throw badRequest('This order has no Stripe payment to refund.');
  const remaining = order.total - order.refundedAmount;
  const amount = body.amount == null ? remaining : Math.round(body.amount * 100);
  if (amount < 1 || amount > remaining) throw badRequest(`Refund must be between $0.01 and ${`$${dollars(remaining)}`}.`);
  const isFull = amount === remaining;
  if (body.restock && !isFull) throw badRequest('Items can only be restocked on a full refund.');

  const stripe = getStripe(); // 503 if Stripe isn't configured
  let refund;
  try {
    refund = await stripe.refunds.create(
      { payment_intent: order.stripePaymentIntentId, amount, metadata: { orderNumber: order.orderNumber, refundedBy: req.user.email } },
      { idempotencyKey: `wakis-refund-${order.id}-${order.refundedAmount}-${amount}` },
    );
  } catch (err) {
    console.error('[stripe] refund failed:', err.message);
    throw new HttpError(502, `Stripe could not process the refund: ${err.message}`);
  }

  const updated = await prisma.$transaction(async (tx) => {
    const o = await tx.order.update({
      where: { id },
      data: {
        refundedAmount: { increment: amount },
        refundedAt: new Date(),
        ...(isFull && { paymentStatus: 'REFUNDED', status: 'CANCELLED' }),
      },
      include: { items: true },
    });
    if (isFull && body.restock) {
      for (const i of order.items) {
        if (i.productId) await tx.product.updateMany({ where: { id: i.productId }, data: { inventory: { increment: i.quantity } } });
      }
    }
    return o;
  });
  await logActivity(
    req,
    'ORDER_REFUNDED',
    `${isFull ? 'Full' : 'Partial'} refund of $${dollars(amount)} on ${order.orderNumber}${body.restock ? ' (items restocked)' : ''}${body.reason ? ` — ${body.reason}` : ''}`,
    { entityType: 'ORDER', entityId: order.id },
  );
  res.json({ order: serializeOrder(updated, { admin: true }), refundId: refund.id, message: `Refunded $${dollars(amount)} to the customer’s original payment method.` });
}

// ── Store settings ──────────────────────────────────────────
const money = (max) => z.coerce.number().min(0).max(max).transform((d) => Math.round(d * 100));
const text = (max) => z.string().trim().max(max);
const settingsSchema = z.object({
  taxRatePercent: z.coerce.number().min(0).max(25),
  deliveryEnabled: z.boolean(),
  deliveryFee: money(500),
  freeDeliveryThreshold: money(10000),
  deliveryNote: text(400),
  pickupEnabled: z.boolean(),
  pickupInstructions: text(400),
  storeAddress: text(200),
  storePhone: text(40),
  storeEmail: z.union([z.literal(''), z.string().trim().email('Please enter a valid store email.').max(160)]),
  storeHours: text(200),
  announcement: text(200),
});

export async function getSettings(_req, res) {
  res.json({ settings: await getStoreSettings({ fresh: true }) });
}

export async function updateSettings(req, res) {
  const s = settingsSchema.parse(req.body);
  if (!s.deliveryEnabled && !s.pickupEnabled) throw badRequest('Keep at least one of home delivery or store pickup switched on, or customers cannot check out.');
  const data = {
    taxRate: Math.round(s.taxRatePercent * 1000) / 100000,
    deliveryEnabled: s.deliveryEnabled,
    deliveryFeeCents: s.deliveryFee,
    freeDeliveryThresholdCents: s.freeDeliveryThreshold,
    deliveryNote: s.deliveryNote,
    pickupEnabled: s.pickupEnabled,
    pickupInstructions: s.pickupInstructions,
    storeAddress: s.storeAddress,
    storePhone: s.storePhone,
    storeEmail: s.storeEmail,
    storeHours: s.storeHours,
    announcement: s.announcement,
  };
  const before = await getStoreSettings({ fresh: true });
  await prisma.storeSettings.upsert({ where: { id: 1 }, update: data, create: { id: 1, ...data } });
  clearSettingsCache();
  const after = await getStoreSettings({ fresh: true });
  const changed = [];
  if (before.taxRate !== after.taxRate) changed.push(`tax ${(before.taxRate * 100).toFixed(2)}% → ${(after.taxRate * 100).toFixed(2)}%`);
  if (before.delivery.feeCents !== after.delivery.feeCents) changed.push(`delivery fee $${dollars(before.delivery.feeCents)} → $${dollars(after.delivery.feeCents)}`);
  if (before.delivery.freeThresholdCents !== after.delivery.freeThresholdCents) changed.push('free-delivery threshold');
  if (before.delivery.enabled !== after.delivery.enabled) changed.push(`delivery ${after.delivery.enabled ? 'on' : 'off'}`);
  if (before.pickup.enabled !== after.pickup.enabled) changed.push(`pickup ${after.pickup.enabled ? 'on' : 'off'}`);
  for (const [k, label] of [['address', 'address'], ['phone', 'phone'], ['email', 'email'], ['hours', 'hours'], ['announcement', 'announcement']]) {
    if (before[k] !== after[k]) changed.push(label);
  }
  if (before.delivery.note !== after.delivery.note) changed.push('delivery note');
  if (before.pickup.instructions !== after.pickup.instructions) changed.push('pickup instructions');
  await logActivity(req, 'SETTINGS_UPDATED', changed.length ? `Store settings updated: ${changed.join(', ')}` : 'Store settings saved (no changes)', { entityType: 'SETTINGS' });
  res.json({ settings: after, message: 'Store settings saved. Changes appear on the storefront within a minute.' });
}

// ── Inventory ───────────────────────────────────────────────
const inventoryQuery = z.object({
  view: z.enum(['out', 'low', 'all']).default('low'),
  search: z.string().trim().max(100).optional(),
  category: z.string().trim().max(60).optional(),
});

export async function inventoryList(req, res) {
  const q = inventoryQuery.parse(req.query);
  const where = {
    AND: [
      q.view === 'out' ? { inventory: 0 } : q.view === 'low' ? { inventory: { gt: 0, lte: LOW_STOCK_THRESHOLD } } : {},
      q.category ? { category: { slug: q.category } } : {},
      q.search ? { OR: [{ name: { contains: q.search, mode: 'insensitive' } }, { sku: { contains: q.search, mode: 'insensitive' } }, { brand: { contains: q.search, mode: 'insensitive' } }] } : {},
    ],
  };
  const products = await prisma.product.findMany({ where, include: { category: true, portions: true }, orderBy: [{ inventory: 'asc' }, { name: 'asc' }], take: 300 });
  res.json({ products: products.map((p) => ({ ...serializeProduct(p, { admin: true }), stockValue: p.inventory * p.price })) });
}

export async function inventorySummary(_req, res) {
  const products = await prisma.product.findMany({ select: { inventory: true, price: true, isActive: true, category: { select: { name: true, slug: true, sortOrder: true } } } });
  const byDep = new Map();
  const totals = { products: 0, units: 0, value: 0, outOfStock: 0, lowStock: 0 };
  for (const p of products) {
    const d = byDep.get(p.category.slug) || { department: p.category.name, slug: p.category.slug, sortOrder: p.category.sortOrder, products: 0, units: 0, value: 0, outOfStock: 0, lowStock: 0 };
    const out = p.isActive && p.inventory === 0;
    const low = p.isActive && p.inventory > 0 && p.inventory <= LOW_STOCK_THRESHOLD;
    for (const t of [d, totals]) {
      t.products += 1;
      t.units += p.inventory;
      t.value += p.inventory * p.price;
      if (out) t.outOfStock += 1;
      if (low) t.lowStock += 1;
    }
    byDep.set(p.category.slug, d);
  }
  res.json({ totals, departments: [...byDep.values()].sort((a, b) => a.sortOrder - b.sortOrder), lowStockThreshold: LOW_STOCK_THRESHOLD });
}

const bulkSchema = z.object({
  productIds: z.array(z.coerce.number().int().positive()).min(1).max(500),
  mode: z.enum(['add', 'set']),
  quantity: z.coerce.number().int().min(0).max(100000),
});

export async function bulkInventory(req, res) {
  const { productIds, mode, quantity } = bulkSchema.parse(req.body);
  if (mode === 'add' && quantity === 0) throw badRequest('Enter how many units to add.');
  const result = await prisma.product.updateMany({
    where: { id: { in: productIds } },
    data: mode === 'add' ? { inventory: { increment: quantity } } : { inventory: quantity },
  });
  await logActivity(req, 'INVENTORY_BULK_UPDATE', `${mode === 'add' ? `Added ${quantity} units to` : `Set stock to ${quantity} for`} ${result.count} product${result.count === 1 ? '' : 's'}`, { entityType: 'INVENTORY' });
  res.json({ updated: result.count, message: `Updated stock for ${result.count} product${result.count === 1 ? '' : 's'}.` });
}

const importSchema = z.object({ csv: z.string().min(1, 'Paste or upload a CSV file.').max(180000, 'That file is too large — import at most about 2,000 rows at a time.'), apply: z.boolean().default(false) });

/** CSV import: updates inventory and/or price for existing products matched by SKU. Preview first, then apply. */
export async function importInventory(req, res) {
  const { csv, apply } = importSchema.parse(req.body);
  const { headers, records } = parseCsv(csv);
  if (!headers.includes('sku')) throw badRequest('The CSV needs a "sku" column (export the product list to get a template).');
  if (!headers.includes('inventory') && !headers.includes('price')) throw badRequest('The CSV needs an "inventory" and/or "price" column.');
  if (records.length > 2000) throw badRequest('Please import at most 2,000 rows at a time.');

  const skus = records.map((r) => r.values.sku.toUpperCase()).filter(Boolean);
  const products = await prisma.product.findMany({ where: { sku: { in: skus } }, include: { portions: { select: { id: true } } } });
  const bySku = new Map(products.map((p) => [p.sku.toUpperCase(), p]));
  const changes = [];
  const errors = [];
  for (const { line, values } of records) {
    const sku = values.sku.toUpperCase();
    if (!sku) continue;
    const p = bySku.get(sku);
    if (!p) {
      errors.push({ line, sku, message: 'No product with this SKU.' });
      continue;
    }
    const change = { id: p.id, sku: p.sku, name: p.name, data: {}, description: [] };
    if (values.inventory !== undefined && values.inventory !== '') {
      const n = Number(values.inventory);
      if (!Number.isInteger(n) || n < 0 || n > 100000) errors.push({ line, sku, message: `Invalid inventory "${values.inventory}".` });
      else if (n !== p.inventory) {
        change.data.inventory = n;
        change.description.push(`stock ${p.inventory} → ${n}`);
      }
    }
    if (values.price !== undefined && values.price !== '') {
      const cents = Math.round(Number(values.price.replace(/^\$/, '')) * 100);
      if (p.isDeli || p.portions.length) errors.push({ line, sku, message: 'Deli prices are set per portion in the product editor.' });
      else if (!Number.isFinite(cents) || cents < 1 || cents > 10000000) errors.push({ line, sku, message: `Invalid price "${values.price}".` });
      else if (cents !== p.price) {
        change.data.price = cents;
        if (p.compareAtPrice && cents >= p.compareAtPrice) change.data.compareAtPrice = null; // price raised above the special's regular price ends the special
        change.description.push(`price $${dollars(p.price)} → $${dollars(cents)}`);
      }
    }
    if (change.description.length) changes.push(change);
  }

  if (apply && changes.length) {
    await prisma.$transaction(changes.map((c) => prisma.product.update({ where: { id: c.id }, data: c.data })));
    await logActivity(req, 'INVENTORY_IMPORT', `CSV import updated ${changes.length} product${changes.length === 1 ? '' : 's'}${errors.length ? ` (${errors.length} row${errors.length === 1 ? '' : 's'} skipped)` : ''}`, { entityType: 'INVENTORY' });
  }
  res.json({
    applied: Boolean(apply && changes.length),
    rows: records.length,
    changes: changes.map(({ sku, name, description }) => ({ sku, name, change: description.join(', ') })),
    errors,
  });
}

// ── Customers ───────────────────────────────────────────────
async function customerRows() {
  const [groups, users, latestNames] = await Promise.all([
    prisma.order.groupBy({
      by: ['customerEmail'],
      where: { paymentStatus: { in: ['PAID', 'REFUNDED'] } },
      _count: { _all: true },
      _sum: { total: true, refundedAmount: true },
      _min: { paidAt: true },
      _max: { paidAt: true },
    }),
    prisma.user.findMany({ select: { id: true, name: true, email: true, role: true, createdAt: true } }),
    prisma.order.findMany({ where: { paymentStatus: { in: ['PAID', 'REFUNDED'] } }, orderBy: { createdAt: 'desc' }, distinct: ['customerEmail'], select: { customerEmail: true, customerName: true } }),
  ]);
  const nameByEmail = new Map(latestNames.map((o) => [o.customerEmail.toLowerCase(), o.customerName]));
  const rows = new Map();
  for (const u of users) {
    rows.set(u.email.toLowerCase(), { email: u.email, name: u.name, hasAccount: true, role: u.role, joinedAt: u.createdAt, orders: 0, totalSpent: 0, firstOrderAt: null, lastOrderAt: null });
  }
  for (const g of groups) {
    const key = g.customerEmail.toLowerCase();
    const r = rows.get(key) || { email: g.customerEmail, name: nameByEmail.get(key) || g.customerEmail, hasAccount: false, role: null, joinedAt: null, orders: 0, totalSpent: 0, firstOrderAt: null, lastOrderAt: null };
    r.orders += g._count._all;
    r.totalSpent += (g._sum.total || 0) - (g._sum.refundedAmount || 0);
    r.firstOrderAt = g._min.paidAt;
    r.lastOrderAt = g._max.paidAt;
    rows.set(key, r);
  }
  return [...rows.values()];
}

const customersQuery = z.object({
  search: z.string().trim().max(100).optional(),
  sort: z.enum(['spent', 'recent', 'orders', 'name']).default('spent'),
  type: z.enum(['all', 'registered', 'guest']).default('all'),
});

export async function listCustomers(req, res) {
  const q = customersQuery.parse(req.query);
  let rows = await customerRows();
  if (q.type === 'registered') rows = rows.filter((r) => r.hasAccount);
  if (q.type === 'guest') rows = rows.filter((r) => !r.hasAccount);
  if (q.search) {
    const s = q.search.toLowerCase();
    rows = rows.filter((r) => r.name.toLowerCase().includes(s) || r.email.toLowerCase().includes(s));
  }
  const sorters = {
    spent: (a, b) => b.totalSpent - a.totalSpent,
    orders: (a, b) => b.orders - a.orders,
    recent: (a, b) => new Date(b.lastOrderAt || 0) - new Date(a.lastOrderAt || 0),
    name: (a, b) => a.name.localeCompare(b.name),
  };
  rows.sort(sorters[q.sort]);
  res.json({
    customers: rows.slice(0, 500),
    totals: { customers: rows.length, registered: rows.filter((r) => r.hasAccount).length, repeat: rows.filter((r) => r.orders > 1).length },
  });
}

export async function customerDetail(req, res) {
  const { email } = z.object({ email: z.string().trim().toLowerCase().email() }).parse(req.query);
  const [user, orders] = await Promise.all([
    prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } }, select: { id: true, name: true, email: true, role: true, phone: true, createdAt: true, addressLine1: true, city: true, state: true, postalCode: true } }),
    prisma.order.findMany({ where: { customerEmail: { equals: email, mode: 'insensitive' }, stripeSessionId: { not: null } }, include: { items: true }, orderBy: { createdAt: 'desc' } }),
  ]);
  if (!user && !orders.length) throw notFound('No customer with that email.');
  const paid = orders.filter((o) => ['PAID', 'REFUNDED'].includes(o.paymentStatus));
  res.json({
    customer: {
      email,
      name: user?.name || orders[0]?.customerName,
      phone: user?.phone || orders.find((o) => o.customerPhone)?.customerPhone || null,
      hasAccount: Boolean(user),
      role: user?.role || null,
      joinedAt: user?.createdAt || null,
      address: user?.addressLine1 ? `${user.addressLine1}, ${user.city || ''} ${user.state || ''} ${user.postalCode || ''}`.trim() : null,
      orders: paid.length,
      totalSpent: paid.reduce((s, o) => s + o.total - o.refundedAmount, 0),
      averageOrder: paid.length ? Math.round(paid.reduce((s, o) => s + o.total - o.refundedAmount, 0) / paid.length) : 0,
    },
    orders: orders.map((o) => serializeOrder(o, { admin: true })),
  });
}

// ── Specials ────────────────────────────────────────────────
export async function listSpecials(_req, res) {
  await expireSpecials({ force: true });
  const products = await prisma.product.findMany({
    where: { compareAtPrice: { not: null } },
    include: { category: true, portions: true },
    orderBy: [{ specialEndsAt: 'asc' }, { name: 'asc' }],
  });
  res.json({
    specials: products.map((p) => ({
      ...serializeProduct(p, { admin: true }),
      specialEndsAt: p.specialEndsAt,
      percentOff: p.compareAtPrice ? Math.round((1 - p.price / p.compareAtPrice) * 100) : 0,
    })),
  });
}

const specialSchema = z.object({
  productIds: z.array(z.coerce.number().int().positive()).min(1, 'Choose at least one product.').max(500),
  percentOff: z.coerce.number().int().min(1, 'Discount must be at least 1%.').max(90, 'Discount can be at most 90%.'),
  endsAt: z.coerce.date().optional().nullable(),
});

export async function createSpecial(req, res) {
  const { productIds, percentOff, endsAt } = specialSchema.parse(req.body);
  if (endsAt && endsAt <= new Date()) throw badRequest('The end date must be in the future.');
  const { applied, skipped } = await applySpecial(productIds, percentOff, endsAt);
  if (applied.length) {
    await logActivity(
      req,
      'SPECIAL_CREATED',
      `${percentOff}% off ${applied.length} product${applied.length === 1 ? '' : 's'}${endsAt ? ` until ${endsAt.toISOString().slice(0, 10)}` : ''}: ${applied.map((a) => a.name).slice(0, 8).join(', ')}${applied.length > 8 ? '…' : ''}`,
      { entityType: 'SPECIAL' },
    );
  }
  res.status(applied.length ? 201 : 200).json({ applied, skipped, message: `${percentOff}% off applied to ${applied.length} product${applied.length === 1 ? '' : 's'}.` });
}

export async function deleteSpecials(req, res) {
  const { productIds } = z.object({ productIds: z.array(z.coerce.number().int().positive()).min(1).max(500) }).parse(req.body);
  const ended = await endSpecials(productIds);
  if (ended.length) {
    await logActivity(req, 'SPECIAL_ENDED', `Ended special on ${ended.length} product${ended.length === 1 ? '' : 's'}: ${ended.map((e) => e.name).slice(0, 8).join(', ')}${ended.length > 8 ? '…' : ''}`, { entityType: 'SPECIAL' });
  }
  res.json({ ended, message: `Regular prices restored for ${ended.length} product${ended.length === 1 ? '' : 's'}.` });
}

// ── Activity log ────────────────────────────────────────────
const activityQuery = z.object({
  search: z.string().trim().max(100).optional(),
  type: z.enum(['PRODUCT', 'ORDER', 'CATEGORY', 'USER', 'SETTINGS', 'INVENTORY', 'SPECIAL']).optional(),
  page: z.coerce.number().int().min(1).default(1),
});

export async function listActivity(req, res) {
  const q = activityQuery.parse(req.query);
  const limit = 50;
  const where = {
    ...(q.type && { entityType: q.type }),
    ...(q.search && { OR: [{ summary: { contains: q.search, mode: 'insensitive' } }, { userName: { contains: q.search, mode: 'insensitive' } }, { userEmail: { contains: q.search, mode: 'insensitive' } }] }),
  };
  const [total, entries] = await Promise.all([
    prisma.adminActivity.count({ where }),
    prisma.adminActivity.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (q.page - 1) * limit, take: limit }),
  ]);
  res.json({ entries, total, page: q.page, pages: Math.max(1, Math.ceil(total / limit)) });
}
