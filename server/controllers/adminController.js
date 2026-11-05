import { z } from 'zod';
import { prisma } from '../utils/prisma.js';
import { serializeProduct, serializeOrder } from '../utils/serializers.js';
import { slugify } from '../utils/slugify.js';
import { badRequest, notFound, conflict } from '../utils/httpError.js';
import { ORDER_STATUSES, ORIGINS, LOW_STOCK_THRESHOLD } from '../utils/constants.js';
import { listProducts } from './productController.js';

const money = z.coerce.number().min(0).max(100000).transform((d) => Math.round(d * 100)); // dollars → cents

const productSchema = z.object({
  name: z.string().trim().min(2).max(140),
  description: z.string().trim().min(5).max(2000),
  image: z.string().trim().min(1, 'An image is required.').max(500).regex(/^(\/|https:\/\/)/, 'Image must be an uploaded file or an https:// URL.'),
  price: money,
  compareAtPrice: money.nullable().optional(),
  unit: z.string().trim().max(60).optional().or(z.literal('')),
  categoryId: z.coerce.number().int().positive(),
  subcategory: z.string().trim().max(80).optional().or(z.literal('')),
  brand: z.string().trim().min(1).max(80),
  sku: z.string().trim().min(2).max(40).regex(/^[A-Za-z0-9-]+$/, 'SKU may contain letters, numbers and dashes only.'),
  origin: z.enum(ORIGINS),
  inventory: z.coerce.number().int().min(0).max(100000),
  isActive: z.boolean(),
  featured: z.boolean(),
  isDeli: z.boolean(),
  portions: z.array(z.object({ label: z.string().trim().min(1).max(60), price: money })).max(10).optional(),
});

const patchSchema = z
  .object({
    inventory: z.coerce.number().int().min(0).max(100000),
    isActive: z.boolean(),
    featured: z.boolean(),
    price: money,
  })
  .partial();

const categorySchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500).optional().or(z.literal('')),
  image: z.string().trim().max(500).optional().or(z.literal('')),
  sortOrder: z.coerce.number().int().min(0).max(1000).optional(),
});

const idParam = (req) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) throw badRequest('Invalid id.');
  return id;
};

function productData(data) {
  const portions = data.isDeli ? data.portions || [] : [];
  // For products with portions, the listed price is the cheapest portion.
  const price = portions.length ? Math.min(...portions.map((p) => p.price)) : data.price;
  return {
    data: {
      name: data.name,
      slug: slugify(data.name),
      description: data.description,
      image: data.image,
      price,
      compareAtPrice: data.compareAtPrice && data.compareAtPrice > price ? data.compareAtPrice : null,
      unit: data.unit || null,
      categoryId: data.categoryId,
      subcategory: data.subcategory || null,
      brand: data.brand,
      sku: data.sku.toUpperCase(),
      origin: data.origin,
      inventory: data.inventory,
      isActive: data.isActive,
      featured: data.featured,
      isDeli: data.isDeli,
    },
    portions,
  };
}

async function uniqueSlug(base, excludeId) {
  let slug = base;
  for (let i = 2; ; i++) {
    const clash = await prisma.product.findFirst({ where: { slug, ...(excludeId && { id: { not: excludeId } }) }, select: { id: true } });
    if (!clash) return slug;
    slug = `${base}-${i}`;
  }
}

// ── Dashboard ───────────────────────────────────────────────
export async function stats(_req, res) {
  const paid = { paymentStatus: 'PAID' };
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [totalProducts, activeProducts, deliItems, totalOrders, paidOrders, revenue, revenue30, byStatus, lowStock, recentOrders, topSellers, customers, subscribers, messages] =
    await Promise.all([
      prisma.product.count(),
      prisma.product.count({ where: { isActive: true } }),
      prisma.product.count({ where: { isDeli: true } }),
      prisma.order.count({ where: { stripeSessionId: { not: null } } }),
      prisma.order.count({ where: paid }),
      prisma.order.aggregate({ where: paid, _sum: { total: true }, _avg: { total: true } }),
      prisma.order.aggregate({ where: { ...paid, paidAt: { gte: since } }, _sum: { total: true }, _count: { _all: true } }),
      prisma.order.groupBy({ by: ['status'], where: { stripeSessionId: { not: null } }, _count: { _all: true } }),
      prisma.product.findMany({ where: { isActive: true, inventory: { lte: LOW_STOCK_THRESHOLD } }, include: { category: true }, orderBy: { inventory: 'asc' }, take: 10 }),
      prisma.order.findMany({ where: { stripeSessionId: { not: null } }, include: { items: true }, orderBy: { createdAt: 'desc' }, take: 8 }),
      prisma.orderItem.groupBy({
        by: ['productName'],
        where: { order: paid },
        _sum: { quantity: true, lineTotal: true },
        orderBy: { _sum: { lineTotal: 'desc' } },
        take: 5,
      }),
      prisma.user.count({ where: { role: 'CUSTOMER' } }),
      prisma.newsletterSubscriber.count(),
      prisma.contactMessage.count(),
    ]);

  res.json({
    products: { total: totalProducts, active: activeProducts, deli: deliItems },
    orders: { total: totalOrders, paid: paidOrders, byStatus: Object.fromEntries(byStatus.map((s) => [s.status, s._count._all])) },
    sales: {
      revenue: revenue._sum.total || 0,
      averageOrder: Math.round(revenue._avg.total || 0),
      last30Days: revenue30._sum.total || 0,
      ordersLast30Days: revenue30._count._all,
    },
    customers,
    subscribers,
    messages,
    lowStock: lowStock.map((p) => serializeProduct(p, { admin: true })),
    recentOrders: recentOrders.map((o) => serializeOrder(o, { admin: true })),
    topSellers: topSellers.map((t) => ({ name: t.productName, quantity: t._sum.quantity, revenue: t._sum.lineTotal })),
  });
}

// ── Products ────────────────────────────────────────────────
export const adminListProducts = (req, res) => listProducts(req, res, { admin: true });

export async function adminGetProduct(req, res) {
  const product = await prisma.product.findUnique({ where: { id: idParam(req) }, include: { category: true, portions: true } });
  if (!product) throw notFound('Product not found.');
  res.json({ product: serializeProduct(product, { admin: true }) });
}

export async function createProduct(req, res) {
  // Deli items without portions are allowed — they sell at a single price.
  const { data, portions } = productData(productSchema.parse(req.body));
  data.slug = await uniqueSlug(data.slug);
  const product = await prisma.product.create({
    data: { ...data, portions: { create: portions.map((p, i) => ({ label: p.label, price: p.price, sortOrder: i })) } },
    include: { category: true, portions: true },
  });
  res.status(201).json({ product: serializeProduct(product, { admin: true }) });
}

export async function updateProduct(req, res) {
  const id = idParam(req);
  const parsed = productSchema.parse(req.body);
  const { data, portions } = productData(parsed);
  data.slug = await uniqueSlug(data.slug, id);
  const product = await prisma.$transaction(async (tx) => {
    await tx.product.findUniqueOrThrow({ where: { id } });
    await tx.portionOption.deleteMany({ where: { productId: id } });
    return tx.product.update({
      where: { id },
      data: { ...data, portions: { create: portions.map((p, i) => ({ label: p.label, price: p.price, sortOrder: i })) } },
      include: { category: true, portions: true },
    });
  });
  res.json({ product: serializeProduct(product, { admin: true }) });
}

export async function patchProduct(req, res) {
  const id = idParam(req);
  const data = patchSchema.parse(req.body);
  if (Object.keys(data).length === 0) throw badRequest('Nothing to update.');
  const product = await prisma.product.update({ where: { id }, data, include: { category: true, portions: true } });
  res.json({ product: serializeProduct(product, { admin: true }) });
}

export async function deleteProduct(req, res) {
  const id = idParam(req);
  // Past order items keep their own name/price snapshot; their product link is set to null.
  await prisma.product.delete({ where: { id } });
  res.json({ ok: true });
}

export function uploadImage(req, res) {
  if (!req.file) throw badRequest('Please choose an image to upload.');
  res.status(201).json({ url: `/uploads/${req.file.filename}` });
}

// ── Categories ──────────────────────────────────────────────
export async function listAdminCategories(_req, res) {
  const categories = await prisma.category.findMany({ orderBy: { sortOrder: 'asc' }, include: { _count: { select: { products: true } } } });
  res.json({ categories: categories.map((c) => ({ ...c, productCount: c._count.products, _count: undefined })) });
}

export async function createCategory(req, res) {
  const data = categorySchema.parse(req.body);
  const category = await prisma.category.create({
    data: { name: data.name, slug: slugify(data.name), description: data.description || null, image: data.image || null, sortOrder: data.sortOrder ?? 100 },
  });
  res.status(201).json({ category });
}

export async function updateCategory(req, res) {
  const id = idParam(req);
  const data = categorySchema.parse(req.body);
  const existing = await prisma.category.findUnique({ where: { id } });
  if (!existing) throw notFound('Category not found.');
  // Slugs are kept stable once created so storefront links don't break.
  const category = await prisma.category.update({
    where: { id },
    data: { name: data.name, description: data.description || null, image: data.image || null, ...(data.sortOrder != null && { sortOrder: data.sortOrder }) },
  });
  res.json({ category });
}

export async function deleteCategory(req, res) {
  const id = idParam(req);
  const count = await prisma.product.count({ where: { categoryId: id } });
  if (count > 0) throw conflict(`This category still has ${count} products. Move or delete them first.`);
  await prisma.category.delete({ where: { id } });
  res.json({ ok: true });
}

// ── Orders ──────────────────────────────────────────────────
const orderQuery = z.object({
  status: z.enum(ORDER_STATUSES).optional(),
  paymentStatus: z.enum(['UNPAID', 'PAID', 'FAILED', 'REFUNDED']).optional(),
  search: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export async function listOrders(req, res) {
  const q = orderQuery.parse(req.query);
  const page = q.page || 1;
  const limit = q.limit || 20;
  const where = {
    stripeSessionId: { not: null },
    ...(q.status && { status: q.status }),
    ...(q.paymentStatus && { paymentStatus: q.paymentStatus }),
    ...(q.search && {
      OR: [{ orderNumber: { contains: q.search } }, { customerName: { contains: q.search } }, { customerEmail: { contains: q.search } }],
    }),
  };
  const [total, orders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({ where, include: { items: true }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
  ]);
  res.json({ orders: orders.map((o) => serializeOrder(o, { admin: true })), total, page, pages: Math.max(1, Math.ceil(total / limit)) });
}

export async function getOrder(req, res) {
  const order = await prisma.order.findUnique({ where: { id: idParam(req) }, include: { items: { include: { product: { select: { slug: true } } } } } });
  if (!order) throw notFound('Order not found.');
  res.json({ order: serializeOrder(order, { admin: true }) });
}

export async function updateOrderStatus(req, res) {
  const id = idParam(req);
  const { status } = z.object({ status: z.enum(ORDER_STATUSES) }).parse(req.body);
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) throw notFound('Order not found.');
  const fulfilmentStatuses = ['PROCESSING', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY', 'COMPLETED'];
  if (fulfilmentStatuses.includes(status) && order.paymentStatus !== 'PAID') {
    throw badRequest('Only paid orders can move into fulfilment.');
  }
  if (status === 'PAID' && order.paymentStatus !== 'PAID') {
    throw badRequest('Orders are marked paid automatically when Stripe confirms the payment.');
  }
  if (status === 'READY_FOR_PICKUP' && order.fulfillmentMethod !== 'PICKUP') throw badRequest('This is a delivery order.');
  if (status === 'OUT_FOR_DELIVERY' && order.fulfillmentMethod !== 'DELIVERY') throw badRequest('This is a pickup order.');
  const updated = await prisma.order.update({ where: { id }, data: { status }, include: { items: true } });
  res.json({ order: serializeOrder(updated, { admin: true }) });
}

export async function listMessages(_req, res) {
  const [messages, subscribers] = await Promise.all([
    prisma.contactMessage.findMany({ orderBy: { createdAt: 'desc' }, take: 100 }),
    prisma.newsletterSubscriber.findMany({ orderBy: { createdAt: 'desc' }, take: 200 }),
  ]);
  res.json({ messages, subscribers });
}
