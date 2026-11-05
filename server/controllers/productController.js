import { z } from 'zod';
import { prisma } from '../utils/prisma.js';
import { serializeProduct } from '../utils/serializers.js';
import { notFound } from '../utils/httpError.js';

const listQuery = z.object({
  search: z.string().trim().max(100).optional(),
  category: z.string().trim().max(60).optional(),
  subcategory: z.string().trim().max(80).optional(),
  origin: z.enum(['AFRICAN', 'CARIBBEAN']).optional(),
  brand: z.string().trim().max(500).optional(), // comma-separated
  minPrice: z.coerce.number().min(0).optional(), // dollars
  maxPrice: z.coerce.number().min(0).optional(),
  featured: z.enum(['true', 'false']).optional(),
  inStock: z.enum(['true', 'false']).optional(),
  onSale: z.enum(['true', 'false']).optional(),
  deli: z.enum(['true', 'false']).optional(),
  status: z.enum(['active', 'inactive', 'all']).optional(), // admin only
  sort: z.enum(['relevance', 'featured', 'price_asc', 'price_desc', 'name_asc', 'name_desc', 'popular', 'newest']).optional(),
  page: z.coerce.number().int().min(1).max(1000).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

const SORTS = {
  featured: [{ featured: 'desc' }, { popularity: 'desc' }, { name: 'asc' }],
  price_asc: [{ price: 'asc' }, { name: 'asc' }],
  price_desc: [{ price: 'desc' }, { name: 'asc' }],
  name_asc: [{ name: 'asc' }],
  name_desc: [{ name: 'desc' }],
  popular: [{ popularity: 'desc' }, { name: 'asc' }],
  newest: [{ createdAt: 'desc' }, { id: 'desc' }],
};

// Ranks search results: name matches first, then brand/subcategory, then description; ties by popularity.
// The catalog is a few hundred rows, so scoring the matching set in memory is cheap.
async function findByRelevance(where, search, page, limit) {
  const all = await prisma.product.findMany({ where, include: { category: true, portions: true } });
  const terms = search.toLowerCase().split(/s+/).filter(Boolean);
  const phrase = search.toLowerCase().trim();
  const score = (p) => {
    const name = p.name.toLowerCase();
    let s = name.startsWith(phrase) ? 60 : name.includes(phrase) ? 40 : 0;
    for (const t of terms) {
      if (name.includes(t)) s += 20;
      if (p.brand.toLowerCase().includes(t)) s += 8;
      if ((p.subcategory || '').toLowerCase().includes(t)) s += 6;
      if (p.category.name.toLowerCase().includes(t)) s += 4;
    }
    return s;
  };
  return all
    .map((p) => ({ p, s: score(p) }))
    .sort((a, b) => b.s - a.s || b.p.popularity - a.p.popularity)
    .slice((page - 1) * limit, page * limit)
    .map((x) => x.p);
}

function buildWhere(q, { admin }) {
  const and = [];
  if (!admin || !q.status || q.status === 'active') and.push({ isActive: true });
  if (admin && q.status === 'inactive') and.push({ isActive: false });
  if (q.category) and.push({ category: { slug: q.category } });
  if (q.subcategory) and.push({ subcategory: q.subcategory });
  if (q.origin) and.push({ origin: { in: [q.origin, 'BOTH'] } });
  if (q.featured === 'true') and.push({ featured: true });
  if (q.inStock === 'true') and.push({ inventory: { gt: 0 } });
  if (q.onSale === 'true') and.push({ compareAtPrice: { not: null } });
  if (q.deli === 'true') and.push({ isDeli: true });
  if (q.deli === 'false') and.push({ isDeli: false });
  if (q.minPrice != null) and.push({ price: { gte: Math.round(q.minPrice * 100) } });
  if (q.maxPrice != null) and.push({ price: { lte: Math.round(q.maxPrice * 100) } });
  if (q.search) {
    // Every word must match somewhere (name, brand, subcategory, category or description).
    for (const term of q.search.split(/\s+/).filter(Boolean).slice(0, 6)) {
      and.push({
        OR: [
          { name: { contains: term, mode: 'insensitive' } },
          { brand: { contains: term, mode: 'insensitive' } },
          { subcategory: { contains: term, mode: 'insensitive' } },
          { sku: { contains: term, mode: 'insensitive' } },
          { category: { name: { contains: term, mode: 'insensitive' } } },
          { description: { contains: term, mode: 'insensitive' } },
        ],
      });
    }
  }
  return and;
}

export async function listProducts(req, res, { admin = false } = {}) {
  const q = listQuery.parse(req.query);
  const page = q.page || 1;
  const limit = q.limit || 24;
  const base = buildWhere(q, { admin });
  const brands = q.brand ? q.brand.split(',').map((b) => b.trim()).filter(Boolean) : [];
  const where = { AND: brands.length ? [...base, { brand: { in: brands } }] : base };

  const sort = q.sort || (q.search ? 'relevance' : 'featured');
  const findPage = () =>
    sort === 'relevance' && q.search
      ? findByRelevance(where, q.search, page, limit)
      : prisma.product.findMany({ where, include: { category: true, portions: true }, orderBy: SORTS[sort] || SORTS.featured, skip: (page - 1) * limit, take: limit });

  const [total, products, brandFacets, subcategoryFacets, priceAgg] = await Promise.all([
    prisma.product.count({ where }),
    findPage(),
    // Brand facet ignores the brand filter itself so shoppers can multi-select.
    prisma.product.groupBy({ by: ['brand'], where: { AND: base }, _count: { _all: true }, orderBy: { brand: 'asc' } }),
    prisma.product.groupBy({ by: ['subcategory'], where: { AND: base.filter((c) => !('subcategory' in c)) }, _count: { _all: true }, orderBy: { subcategory: 'asc' } }),
    prisma.product.aggregate({ where: { AND: base }, _min: { price: true }, _max: { price: true } }),
  ]);

  res.json({
    products: products.map((p) => serializeProduct(p, { admin })),
    total,
    page,
    limit,
    pages: Math.max(1, Math.ceil(total / limit)),
    facets: {
      brands: brandFacets.map((b) => ({ value: b.brand, count: b._count._all })),
      subcategories: subcategoryFacets.filter((s) => s.subcategory).map((s) => ({ value: s.subcategory, count: s._count._all })),
      price: { min: priceAgg._min.price ?? 0, max: priceAgg._max.price ?? 0 },
    },
  });
}

export async function getProduct(req, res) {
  const product = await prisma.product.findFirst({
    where: { slug: req.params.slug, isActive: true },
    include: { category: true, portions: true },
  });
  if (!product) throw notFound('Product not found.');

  const related = await prisma.product.findMany({
    where: { isActive: true, id: { not: product.id }, categoryId: product.categoryId, subcategory: product.subcategory },
    include: { category: true, portions: true },
    orderBy: { popularity: 'desc' },
    take: 4,
  });
  if (related.length < 4) {
    const more = await prisma.product.findMany({
      where: { isActive: true, id: { notIn: [product.id, ...related.map((r) => r.id)] }, categoryId: product.categoryId },
      include: { category: true, portions: true },
      orderBy: { popularity: 'desc' },
      take: 4 - related.length,
    });
    related.push(...more);
  }
  res.json({ product: serializeProduct(product), related: related.map((p) => serializeProduct(p)) });
}

export async function getHome(_req, res) {
  const include = { category: true, portions: true };
  const active = { isActive: true };
  const [bestSellers, african, caribbean, deli, specials, featured, categories] = await Promise.all([
    prisma.product.findMany({ where: { ...active, isDeli: false, inventory: { gt: 0 } }, include, orderBy: { popularity: 'desc' }, take: 8 }),
    prisma.product.findMany({ where: { ...active, category: { slug: 'african-groceries' } }, include, orderBy: [{ featured: 'desc' }, { popularity: 'desc' }], take: 4 }),
    prisma.product.findMany({ where: { ...active, category: { slug: 'caribbean-groceries' } }, include, orderBy: [{ featured: 'desc' }, { popularity: 'desc' }], take: 4 }),
    prisma.product.findMany({ where: { ...active, isDeli: true }, include, orderBy: [{ featured: 'desc' }, { popularity: 'desc' }], take: 6 }),
    prisma.product.findMany({ where: { ...active, compareAtPrice: { not: null }, inventory: { gt: 0 } }, include, orderBy: { popularity: 'desc' }, take: 4 }),
    prisma.product.findMany({ where: { ...active, featured: true }, include, orderBy: { popularity: 'desc' }, take: 8 }),
    prisma.category.findMany({ orderBy: { sortOrder: 'asc' }, include: { _count: { select: { products: { where: active } } } } }),
  ]);
  const s = (list) => list.map((p) => serializeProduct(p));
  res.json({
    bestSellers: s(bestSellers),
    african: s(african),
    caribbean: s(caribbean),
    deli: s(deli),
    specials: s(specials),
    featured: s(featured),
    categories: categories.map((c) => ({ id: c.id, name: c.name, slug: c.slug, description: c.description, image: c.image, productCount: c._count.products })),
  });
}

export async function listCategories(_req, res) {
  const categories = await prisma.category.findMany({
    orderBy: { sortOrder: 'asc' },
    include: { _count: { select: { products: { where: { isActive: true } } } } },
  });
  res.json({
    categories: categories.map((c) => ({ id: c.id, name: c.name, slug: c.slug, description: c.description, image: c.image, sortOrder: c.sortOrder, productCount: c._count.products })),
  });
}

export async function getCategory(req, res) {
  const c = await prisma.category.findUnique({ where: { slug: req.params.slug } });
  if (!c) throw notFound('Category not found.');
  res.json({ category: { id: c.id, name: c.name, slug: c.slug, description: c.description, image: c.image } });
}
