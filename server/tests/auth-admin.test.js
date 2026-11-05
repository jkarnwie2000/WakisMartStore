import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, client } from './helpers.js';
import { prisma } from '../utils/prisma.js';
import { generateOrderNumber } from '../utils/orderNumber.js';

let srv;
before(async () => {
  srv = await startServer();
});
after(async () => {
  await srv.close();
  await prisma.$disconnect();
});

test('registration hashes passwords and validates input', async () => {
  const api = client(srv.base);
  const weak = await api.post('/api/auth/register', { name: 'Kofi', email: 'kofi@example.com', password: 'short' });
  assert.equal(weak.status, 400);
  const r = await api.post('/api/auth/register', { name: 'Kofi Mensah', email: 'Kofi@Example.com', password: 'Plantain123' });
  assert.equal(r.status, 201);
  assert.equal(r.data.user.email, 'kofi@example.com');
  assert.equal(r.data.user.role, 'CUSTOMER');
  assert.equal(r.data.user.passwordHash, undefined);
  const stored = await prisma.user.findUnique({ where: { email: 'kofi@example.com' } });
  assert.notEqual(stored.passwordHash, 'Plantain123');
  assert.match(stored.passwordHash, /^\$2[aby]\$/);
  const dup = await api.post('/api/auth/register', { name: 'Kofi', email: 'kofi@example.com', password: 'Plantain123' });
  assert.equal(dup.status, 409);
});

test('login, session cookie, profile update and logout', async () => {
  const api = client(srv.base);
  assert.equal((await api.post('/api/auth/login', { email: 'kofi@example.com', password: 'wrongpass1' })).status, 401);
  assert.equal((await api.post('/api/auth/login', { email: 'kofi@example.com', password: 'Plantain123' })).status, 200);
  assert.equal((await api.get('/api/auth/me')).data.user.name, 'Kofi Mensah');
  const upd = await api.put('/api/auth/profile', { name: 'Kofi A. Mensah', phone: '555-0100', address: { line1: '12 Market St', city: 'Accra' } });
  assert.equal(upd.data.user.address.city, 'Accra');
  await api.post('/api/auth/logout');
  assert.equal((await api.get('/api/auth/me')).data.user, null);
  assert.equal((await api.get('/api/orders/mine')).status, 401);
});

test('order history only shows the signed-in customer’s own orders', async () => {
  const api = client(srv.base);
  await api.post('/api/auth/login', { email: 'kofi@example.com', password: 'Plantain123' });
  const kofi = await prisma.user.findUnique({ where: { email: 'kofi@example.com' } });
  const mine = await prisma.order.create({
    data: { orderNumber: generateOrderNumber(), userId: kofi.id, customerName: 'Kofi', customerEmail: 'kofi@example.com', fulfillmentMethod: 'PICKUP', subtotal: 100, tax: 7, deliveryFee: 0, total: 107, stripeSessionId: 'cs_test_kofi_1' },
  });
  const other = await prisma.order.create({
    data: { orderNumber: generateOrderNumber(), customerName: 'Someone', customerEmail: 'x@example.com', fulfillmentMethod: 'PICKUP', subtotal: 100, tax: 7, deliveryFee: 0, total: 107, stripeSessionId: 'cs_test_other_1' },
  });
  const list = await api.get('/api/orders/mine');
  assert.deepEqual(list.data.orders.map((o) => o.orderNumber), [mine.orderNumber]);
  assert.equal((await api.get(`/api/orders/mine/${mine.orderNumber}`)).status, 200);
  assert.equal((await api.get(`/api/orders/mine/${other.orderNumber}`)).status, 404);
});

test('admin routes are blocked for guests and customers', async () => {
  const guest = client(srv.base);
  assert.equal((await guest.get('/api/admin/stats')).status, 401);
  const customer = client(srv.base);
  await customer.post('/api/auth/login', { email: 'kofi@example.com', password: 'Plantain123' });
  assert.equal((await customer.get('/api/admin/stats')).status, 403);
  assert.equal((await customer.post('/api/admin/products', {})).status, 403);
});

test('admin can manage products, inventory, featured flags and deli availability', async () => {
  const admin = client(srv.base);
  assert.equal((await admin.post('/api/auth/login', { email: 'admin@test.local', password: 'AdminPass123' })).status, 200);
  const stats = await admin.get('/api/admin/stats');
  assert.equal(stats.status, 200);
  assert.ok(stats.data.products.total >= 225);

  const cats = (await admin.get('/api/admin/categories')).data.categories;
  const african = cats.find((c) => c.slug === 'african-groceries');
  const created = await admin.post('/api/admin/products', {
    name: 'Test Kilishi', description: 'Spiced dried beef jerky from Northern Nigeria.', image: '/images/products/suya-spice-yaji.svg', price: 9.5,
    categoryId: african.id, brand: 'Wakis Mart Select', sku: 'AFR-TEST-01', origin: 'AFRICAN', inventory: 10, isActive: true, featured: false, isDeli: false,
  });
  assert.equal(created.status, 201);
  assert.equal(created.data.product.price, 950);
  const id = created.data.product.id;

  const patched = await admin.patch(`/api/admin/products/${id}`, { inventory: 42, featured: true });
  assert.equal(patched.data.product.inventory, 42);
  assert.equal(patched.data.product.featured, true);

  const deli = await prisma.product.findFirst({ where: { isDeli: true } });
  const off = await admin.patch(`/api/admin/products/${deli.id}`, { isActive: false });
  assert.equal(off.data.product.availability, 'UNAVAILABLE');
  assert.equal((await client(srv.base).get(`/api/products/${deli.slug}`)).status, 404, 'hidden deli items disappear from the store');
  await admin.patch(`/api/admin/products/${deli.id}`, { isActive: true });

  assert.equal((await admin.del(`/api/admin/products/${id}`)).status, 200);
  assert.equal((await admin.get(`/api/admin/products/${id}`)).status, 404);
});

test('admin order status workflow enforces payment and fulfilment rules', async () => {
  const admin = client(srv.base);
  await admin.post('/api/auth/login', { email: 'admin@test.local', password: 'AdminPass123' });
  const unpaid = await prisma.order.create({
    data: { orderNumber: generateOrderNumber(), customerName: 'Pat', customerEmail: 'pat@example.com', fulfillmentMethod: 'PICKUP', subtotal: 100, tax: 7, deliveryFee: 0, total: 107, stripeSessionId: 'cs_test_status_1' },
  });
  assert.equal((await admin.patch(`/api/admin/orders/${unpaid.id}/status`, { status: 'PROCESSING' })).status, 400);
  assert.equal((await admin.patch(`/api/admin/orders/${unpaid.id}/status`, { status: 'PAID' })).status, 400);
  await prisma.order.update({ where: { id: unpaid.id }, data: { paymentStatus: 'PAID', status: 'PAID' } });
  for (const status of ['PROCESSING', 'READY_FOR_PICKUP', 'COMPLETED']) {
    const r = await admin.patch(`/api/admin/orders/${unpaid.id}/status`, { status });
    assert.equal(r.status, 200);
    assert.equal(r.data.order.status, status);
  }
  assert.equal((await admin.patch(`/api/admin/orders/${unpaid.id}/status`, { status: 'OUT_FOR_DELIVERY' })).status, 400, 'pickup orders cannot go out for delivery');
  const list = await admin.get('/api/admin/orders?status=COMPLETED');
  assert.ok(list.data.orders.some((o) => o.id === unpaid.id));
});

test('newsletter and contact form', async () => {
  const api = client(srv.base);
  assert.equal((await api.post('/api/newsletter', { email: 'bad' })).status, 400);
  assert.equal((await api.post('/api/newsletter', { email: 'fan@example.com' })).status, 201);
  assert.equal((await api.post('/api/newsletter', { email: 'fan@example.com' })).status, 201, 're-subscribing is harmless');
  assert.equal((await api.post('/api/contact', { name: 'Ada', email: 'ada@example.com', subject: 'Hi', message: 'short' })).status, 400);
  assert.equal((await api.post('/api/contact', { name: 'Ada', email: 'ada@example.com', subject: 'Stock request', message: 'Could you stock ugu leaves every week?' })).status, 201);
});
