import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, client } from './helpers.js';
import { prisma } from '../utils/prisma.js';

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

test('catalog has 200+ unique grocery products and 25+ deli items', async () => {
  const grocery = await prisma.product.count({ where: { isDeli: false } });
  const deli = await prisma.product.count({ where: { isDeli: true } });
  const names = await prisma.product.findMany({ select: { name: true, sku: true } });
  assert.ok(grocery >= 200, `expected 200+ grocery products, got ${grocery}`);
  assert.ok(deli >= 25, `expected 25+ deli items, got ${deli}`);
  assert.equal(new Set(names.map((n) => n.name.toLowerCase())).size, names.length, 'product names must be unique');
  assert.equal(new Set(names.map((n) => n.sku)).size, names.length, 'SKUs must be unique');
});

test('every department category loads products', async () => {
  const slugs = ['african-groceries', 'caribbean-groceries', 'deli', 'fresh-produce', 'meat-seafood', 'frozen-foods', 'snacks-beverages'];
  for (const slug of slugs) {
    const r = await api.get(`/api/products?category=${slug}&limit=5`);
    assert.equal(r.status, 200);
    assert.ok(r.data.total > 0, `${slug} should have products`);
    assert.ok(r.data.products.every((p) => p.category.slug === slug));
  }
});

test('deli items expose portion sizes; price is the cheapest portion', async () => {
  const r = await api.get('/api/products?category=deli&limit=100');
  for (const p of r.data.products) {
    assert.ok(p.isDeli);
    assert.ok(p.portions.length >= 1, `${p.name} should have portions`);
    assert.equal(p.price, Math.min(...p.portions.map((o) => o.price)));
  }
});

test('search ranks name matches first and matches brand/category', async () => {
  const jerk = await api.get('/api/products?search=jerk&limit=3');
  assert.ok(jerk.data.products[0].name.toLowerCase().includes('jerk'));
  const brand = await api.get('/api/products?search=walkerswood');
  assert.ok(brand.data.total >= 2 && brand.data.products.every((p) => p.brand === 'Walkerswood'));
  const none = await api.get('/api/products?search=zzznotaproduct');
  assert.equal(none.data.total, 0);
});

test('filters: price range, brand, origin, in-stock, featured, specials', async () => {
  const price = await api.get('/api/products?minPrice=5&maxPrice=10&limit=100');
  assert.ok(price.data.products.every((p) => p.price >= 500 && p.price <= 1000));
  const brand = await api.get('/api/products?brand=Grace,Maggi&limit=100');
  assert.ok(brand.data.total > 0 && brand.data.products.every((p) => ['Grace', 'Maggi'].includes(p.brand)));
  const carib = await api.get('/api/products?origin=CARIBBEAN&limit=100');
  assert.ok(carib.data.products.every((p) => p.origin === 'CARIBBEAN' || p.origin === 'BOTH'));
  const stock = await api.get('/api/products?inStock=true&limit=100');
  assert.ok(stock.data.products.every((p) => p.inventory > 0));
  const featured = await api.get('/api/products?featured=true&limit=100');
  assert.ok(featured.data.total > 0 && featured.data.products.every((p) => p.featured));
  const specials = await api.get('/api/products?onSale=true&limit=100');
  assert.ok(specials.data.total > 0 && specials.data.products.every((p) => p.compareAtPrice > p.price));
});

test('sorting and pagination', async () => {
  const asc = await api.get('/api/products?sort=price_asc&limit=50');
  const prices = asc.data.products.map((p) => p.price);
  assert.deepEqual(prices, [...prices].sort((a, b) => a - b));
  const az = await api.get('/api/products?sort=name_asc&limit=20');
  const names = az.data.products.map((p) => p.name);
  assert.deepEqual(names, [...names].sort((a, b) => a.localeCompare(b)));
  const p1 = await api.get('/api/products?sort=name_asc&limit=10&page=1');
  const p2 = await api.get('/api/products?sort=name_asc&limit=10&page=2');
  assert.equal(p1.data.pages, Math.ceil(p1.data.total / 10));
  assert.notEqual(p1.data.products[0].id, p2.data.products[0].id);
});

test('product detail, related products and 404', async () => {
  const r = await api.get('/api/products/ackee-in-brine');
  assert.equal(r.status, 200);
  assert.equal(r.data.product.brand, 'Grace');
  assert.ok(r.data.related.length > 0);
  assert.equal((await api.get('/api/products/does-not-exist')).status, 404);
});

test('home endpoint returns every homepage section', async () => {
  const r = await api.get('/api/home');
  for (const key of ['bestSellers', 'african', 'caribbean', 'deli', 'specials', 'featured', 'categories']) {
    assert.ok(r.data[key].length > 0, `${key} should not be empty`);
  }
});
