import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, client } from './helpers.js';
import { prisma } from '../utils/prisma.js';
import { generateOrderNumber } from '../utils/orderNumber.js';
import { clearSettingsCache } from '../services/settings.js';
import { expireSpecials } from '../services/specials.js';

let srv;
let admin;
let customer;

before(async () => {
  srv = await startServer();
  admin = client(srv.base);
  await admin.post('/api/auth/login', { email: 'admin@test.local', password: 'AdminPass123' });
  customer = client(srv.base);
  await customer.post('/api/auth/register', { name: 'Suite Shopper', email: 'suite-shopper@example.com', password: 'Shopper123' });
});
after(async () => {
  await prisma.storeSettings.deleteMany({});
  clearSettingsCache();
  await srv.close();
  await prisma.$disconnect();
});

const product = (slug) => prisma.product.findUnique({ where: { slug } });

/** Creates a PAID order (as if Stripe had confirmed it). */
async function paidOrder({ lines, method = 'PICKUP', email = 'guest-buyer@example.com', name = 'Guest Buyer', status = 'PAID', paymentIntent = null }) {
  const subtotal = lines.reduce((s, l) => s + l.product.price * l.quantity, 0);
  const deliveryFee = method === 'DELIVERY' ? 799 : 0;
  const tax = Math.round(subtotal * 0.07);
  return prisma.order.create({
    data: {
      orderNumber: generateOrderNumber(),
      customerName: name,
      customerEmail: email,
      fulfillmentMethod: method,
      subtotal,
      tax,
      deliveryFee,
      total: subtotal + tax + deliveryFee,
      paymentStatus: 'PAID',
      status,
      paidAt: new Date(),
      stripeSessionId: `cs_test_suite_${Math.random().toString(36).slice(2)}`,
      stripePaymentIntentId: paymentIntent,
      items: {
        create: lines.map((l) => ({ productId: l.product.id, productName: l.product.name, sku: l.product.sku, unitPrice: l.product.price, quantity: l.quantity, lineTotal: l.product.price * l.quantity })),
      },
    },
    include: { items: true },
  });
}

test('every new admin endpoint is refused to customers', async () => {
  for (const path of ['/api/admin/overview', '/api/admin/reports/sales', '/api/admin/settings', '/api/admin/inventory', '/api/admin/customers', '/api/admin/specials', '/api/admin/activity', '/api/admin/fulfilment']) {
    assert.equal((await customer.get(path)).status, 403, path);
  }
  assert.equal((await customer.raw('/api/admin/exports/orders.csv')).status, 403);
  assert.equal((await customer.put('/api/admin/settings', {})).status, 403);
  assert.equal((await customer.post('/api/admin/inventory/bulk', {})).status, 403);
});

test('sales report adds up paid orders by period, department and fulfilment method', async () => {
  const beforeReport = (await admin.get('/api/admin/reports/sales?range=7d')).data;
  const rice = await product('royal-stallion-parboiled-long-grain-rice');
  const ting = await product('ting-grapefruit-soda');
  const o1 = await paidOrder({ lines: [{ product: rice, quantity: 2 }], method: 'DELIVERY' });
  const o2 = await paidOrder({ lines: [{ product: ting, quantity: 3 }], method: 'PICKUP' });

  const r = (await admin.get('/api/admin/reports/sales?range=7d')).data;
  assert.equal(r.group, 'day');
  assert.equal(r.series.length, 7);
  assert.equal(r.totals.revenue - beforeReport.totals.revenue, o1.total + o2.total);
  assert.equal(r.totals.orders - beforeReport.totals.orders, 2);
  assert.equal(r.series.at(-1).revenue - beforeReport.series.at(-1).revenue, o1.total + o2.total, 'today’s bucket');
  assert.equal(r.fulfilment.DELIVERY.orders - beforeReport.fulfilment.DELIVERY.orders, 1);
  assert.ok(r.departments.some((d) => d.department === 'African Groceries'));
  assert.ok(r.bestSellers.some((p) => p.name === rice.name));
  assert.equal((await admin.get('/api/admin/reports/sales?range=12m')).data.group, 'month');
  assert.equal((await admin.get('/api/admin/reports/sales?range=bogus')).status, 400);
});

test('CSV exports download with the right headers and neutralise spreadsheet formulas', async () => {
  const rice = await product('royal-stallion-parboiled-long-grain-rice');
  const o = await paidOrder({ lines: [{ product: rice, quantity: 1 }], name: '=HYPERLINK("http://evil.example","x")' });
  const orders = await admin.raw('/api/admin/exports/orders.csv?range=30d');
  assert.equal(orders.status, 200);
  assert.match(orders.type, /text\/csv/);
  assert.match(orders.disposition, /attachment; filename="wakis-mart-orders-30d.csv"/);
  assert.ok(orders.body.includes(o.orderNumber));
  assert.ok(orders.body.includes(`"'=HYPERLINK(""http://evil.example"",""x"")"`), 'formula is prefixed with a quote');
  const products = await admin.raw('/api/admin/exports/products.csv');
  assert.ok(products.body.split('\r\n')[0].includes('sku,name,department'));
  assert.equal(products.body.trim().split('\r\n').length - 1, await prisma.product.count());
  assert.equal((await admin.raw('/api/admin/exports/customers.csv')).status, 200);
  assert.equal((await admin.raw('/api/admin/exports/sales.csv?range=7d')).status, 200);
});

test('fulfilment board groups orders by stage and the pick list totals items', async () => {
  const yam = await product('pounded-yam-flour');
  const a = await paidOrder({ lines: [{ product: yam, quantity: 2 }] });
  const b = await paidOrder({ lines: [{ product: yam, quantity: 3 }], method: 'DELIVERY' });
  const ready = await paidOrder({ lines: [{ product: yam, quantity: 1 }], status: 'READY_FOR_PICKUP' });
  const board = (await admin.get('/api/admin/fulfilment')).data;
  assert.ok(board.toPack.some((o) => o.orderNumber === a.orderNumber));
  assert.ok(board.toPack.some((o) => o.orderNumber === b.orderNumber));
  assert.ok(board.readyForPickup.some((o) => o.orderNumber === ready.orderNumber));
  const pick = (await admin.get('/api/admin/fulfilment/pick-list')).data;
  const line = pick.lines.find((l) => l.name === yam.name);
  assert.ok(line.quantity >= 5);
  assert.ok(line.orders.some((x) => x.startsWith(a.orderNumber)));
});

test('refunds are validated before Stripe is called, and need Stripe configured', async () => {
  const yam = await product('pounded-yam-flour');
  const unpaid = await prisma.order.create({
    data: { orderNumber: generateOrderNumber(), customerName: 'U', customerEmail: 'u@example.com', fulfillmentMethod: 'PICKUP', subtotal: 100, tax: 7, deliveryFee: 0, total: 107, stripeSessionId: 'cs_test_unpaid_refund' },
  });
  assert.equal((await admin.post(`/api/admin/orders/${unpaid.id}/refund`, {})).status, 400);
  const noPi = await paidOrder({ lines: [{ product: yam, quantity: 1 }] });
  assert.match((await admin.post(`/api/admin/orders/${noPi.id}/refund`, {})).data.error, /no Stripe payment/);
  const paid = await paidOrder({ lines: [{ product: yam, quantity: 1 }], paymentIntent: 'pi_test_123' });
  assert.equal((await admin.post(`/api/admin/orders/${paid.id}/refund`, { amount: 99999 })).status, 400, 'more than the order total');
  assert.equal((await admin.post(`/api/admin/orders/${paid.id}/refund`, { amount: 1, restock: true })).status, 400, 'restock only on full refund');
  assert.equal((await admin.post(`/api/admin/orders/${paid.id}/refund`, {})).status, 503, 'Stripe not configured in tests');
});

test('store settings saved in the dashboard drive the storefront config and checkout totals', async () => {
  const settings = {
    taxRatePercent: 8.5, deliveryEnabled: true, deliveryFee: 5, freeDeliveryThreshold: 50, deliveryNote: 'We deliver within 10 miles.',
    pickupEnabled: true, pickupInstructions: 'Collect at the side door.', storeAddress: '1 Test Street', storePhone: '555-0100',
    storeEmail: 'hello@example.com', storeHours: 'Mon–Sat 9–7', announcement: 'Sorrel season is here!',
  };
  const r = await admin.put('/api/admin/settings', settings);
  assert.equal(r.status, 200);
  const config = (await client(srv.base).get('/api/config')).data;
  assert.equal(config.taxRate, 0.085);
  assert.equal(config.delivery.feeCents, 500);
  assert.equal(config.store.address, '1 Test Street');
  assert.equal(config.announcement, 'Sorrel season is here!');

  const sauce = await product('west-indian-hot-pepper-sauce'); // $4.99
  const quote = (await client(srv.base).post('/api/checkout/quote', { items: [{ productId: sauce.id, quantity: 2 }], fulfillmentMethod: 'DELIVERY' })).data.totals;
  assert.equal(quote.tax, Math.round(998 * 0.085));
  assert.equal(quote.deliveryFee, 500);

  assert.equal((await admin.put('/api/admin/settings', { ...settings, deliveryEnabled: false, pickupEnabled: false })).status, 400, 'cannot switch off both');
  assert.equal((await admin.put('/api/admin/settings', { ...settings, storeEmail: 'nope' })).status, 400);
  const log = (await admin.get('/api/admin/activity?type=SETTINGS')).data.entries;
  assert.match(log[0].summary, /tax 7\.00% → 8\.50%/);

  await prisma.storeSettings.deleteMany({});
  clearSettingsCache();
});

test('inventory: summary, bulk restock, low/out views and CSV import with preview', async () => {
  const summary = (await admin.get('/api/admin/inventory/summary')).data;
  assert.equal(summary.totals.products, await prisma.product.count());
  assert.ok(summary.departments.length >= 7);

  const a = await product('coconut-milk');
  const b = await product('hominy-corn');
  const bulk = await admin.post('/api/admin/inventory/bulk', { productIds: [a.id, b.id], mode: 'add', quantity: 5 });
  assert.equal(bulk.data.updated, 2);
  assert.equal((await product('coconut-milk')).inventory, a.inventory + 5);
  await admin.post('/api/admin/inventory/bulk', { productIds: [a.id, b.id], mode: 'set', quantity: 0 });
  const out = (await admin.get('/api/admin/inventory?view=out')).data.products.map((p) => p.sku);
  assert.ok(out.includes(a.sku) && out.includes(b.sku));

  const csv = `sku,inventory,price\n${a.sku},40,3.25\n${b.sku},12,\nNOPE-999,5,1\nDLI-0001,5,9.99\n`;
  const preview = (await admin.post('/api/admin/inventory/import', { csv, apply: false })).data;
  assert.equal(preview.applied, false);
  assert.equal(preview.changes.length, 3, 'two grocery rows + the deli row’s stock change');
  const deliChange = preview.changes.find((c) => c.sku === 'DLI-0001');
  assert.ok(deliChange && /stock/.test(deliChange.change) && !/price/.test(deliChange.change), 'deli stock imports, deli price does not');
  assert.ok(preview.errors.some((e) => e.sku === 'NOPE-999'));
  assert.ok(preview.errors.some((e) => e.sku === 'DLI-0001' && /portion/.test(e.message)));
  assert.equal((await product('coconut-milk')).inventory, 0, 'preview changes nothing');
  const applied = (await admin.post('/api/admin/inventory/import', { csv, apply: true })).data;
  assert.equal(applied.applied, true);
  const after = await product('coconut-milk');
  assert.equal(after.inventory, 40);
  assert.equal(after.price, 325);
  assert.equal((await admin.post('/api/admin/inventory/import', { csv: 'name,qty\nx,1', apply: false })).status, 400);
});

test('customers combine guests and registered accounts, net of refunds', async () => {
  const ting = await product('ting-grapefruit-soda');
  const guest = await paidOrder({ lines: [{ product: ting, quantity: 1 }], email: 'only-guest@example.com', name: 'Only Guest' });
  const reg = await paidOrder({ lines: [{ product: ting, quantity: 2 }], email: 'suite-shopper@example.com', name: 'Suite Shopper' });
  await prisma.order.update({ where: { id: reg.id }, data: { refundedAmount: 100 } });
  const list = (await admin.get('/api/admin/customers?search=example.com')).data.customers;
  const g = list.find((c) => c.email === 'only-guest@example.com');
  const r = list.find((c) => c.email === 'suite-shopper@example.com');
  assert.equal(g.hasAccount, false);
  assert.equal(g.totalSpent, guest.total);
  assert.equal(r.hasAccount, true);
  assert.equal(r.totalSpent, reg.total - 100);
  const detail = (await admin.get('/api/admin/customers/detail?email=only-guest@example.com')).data;
  assert.equal(detail.customer.orders, 1);
  assert.equal(detail.orders[0].orderNumber, guest.orderNumber);
  assert.equal((await admin.get('/api/admin/customers/detail?email=nobody-x@example.com')).status, 404);
});

test('specials: bulk discount, deli skipped, checkout uses sale price, auto-expiry and manual end', async () => {
  const a = await product('excelsior-water-crackers');
  const b = await product('bulla-cakes');
  const deli = await prisma.product.findFirst({ where: { isDeli: true } });
  const endsAt = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
  const r = await admin.post('/api/admin/specials', { productIds: [a.id, b.id, deli.id], percentOff: 20, endsAt });
  assert.equal(r.status, 201);
  assert.equal(r.data.applied.length, 2);
  assert.equal(r.data.skipped[0].id, deli.id);
  const onSale = await product('excelsior-water-crackers');
  assert.equal(onSale.compareAtPrice, a.price);
  assert.equal(onSale.price, Math.round(a.price * 0.8));

  const quote = (await client(srv.base).post('/api/checkout/quote', { items: [{ productId: a.id, quantity: 1 }], fulfillmentMethod: 'PICKUP' })).data;
  assert.equal(quote.lines[0].unitPrice, onSale.price, 'checkout charges the sale price');
  const listing = (await admin.get('/api/admin/specials')).data.specials.find((s) => s.id === a.id);
  assert.equal(listing.percentOff, 20);

  // Expiry restores the regular price
  await prisma.product.update({ where: { id: a.id }, data: { specialEndsAt: new Date(Date.now() - 1000) } });
  assert.ok((await expireSpecials({ force: true })) >= 1);
  const restored = await product('excelsior-water-crackers');
  assert.equal(restored.price, a.price);
  assert.equal(restored.compareAtPrice, null);

  const ended = await admin.post('/api/admin/specials/end', { productIds: [b.id] });
  assert.equal(ended.data.ended.length, 1);
  assert.equal((await product('bulla-cakes')).price, b.price);
  assert.equal((await admin.post('/api/admin/specials', { productIds: [a.id], percentOff: 20, endsAt: '2000-01-01' })).status, 400, 'end date in the past');
  assert.equal((await admin.post('/api/admin/specials', { productIds: [a.id], percentOff: 95 })).status, 400, 'max 90%');
  const log = (await admin.get('/api/admin/activity?type=SPECIAL')).data.entries.map((e) => e.action);
  assert.ok(log.includes('SPECIAL_CREATED') && log.includes('SPECIAL_ENDED') && log.includes('SPECIAL_EXPIRED'));
});

test('activity log records who changed what', async () => {
  const p = await product('malta-guinness');
  await admin.patch(`/api/admin/products/${p.id}`, { inventory: p.inventory + 3 });
  const entries = (await admin.get('/api/admin/activity?type=PRODUCT')).data.entries;
  const e = entries.find((x) => x.entityId === String(p.id));
  assert.equal(e.action, 'PRODUCT_UPDATED');
  assert.equal(e.userEmail, 'admin@test.local');
  assert.match(e.summary, new RegExp(`stock ${p.inventory} → ${p.inventory + 3}`));
  const search = (await admin.get('/api/admin/activity?search=Malta')).data;
  assert.ok(search.total >= 1);
  const overview = (await admin.get('/api/admin/overview')).data;
  assert.ok(overview.fulfilment.toPack >= 1);
  assert.equal(typeof overview.inventory.outOfStock, 'number');
});
