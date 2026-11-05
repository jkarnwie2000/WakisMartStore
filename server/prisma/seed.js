// Seeds categories, the 200+ product grocery catalog, the deli menu and the admin account.
// Safe to re-run: existing records (matched by slug / email) are left untouched,
// so inventory and price edits made in the admin dashboard are preserved.
// Use `npm run db:reset` for a completely fresh database.
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { CATEGORIES, GROCERY_SECTIONS, DELI_ITEMS, FEATURED } from './data/catalog.js';
import { productImagePath, categoryImagePath } from './generate-images.js';
import { slugify } from '../utils/slugify.js';

const prisma = new PrismaClient();
const ORIGIN = { A: 'AFRICAN', C: 'CARIBBEAN', B: 'BOTH' };
const cents = (dollars) => Math.round(dollars * 100);
// Deterministic pseudo-random numbers so every seed produces the same catalog.
const rand = (seed) => {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return (h >>> 0) / 4294967295;
};

// Weekly specials: show the original (higher) price as a strike-through.
const specialPrice = (priceCents) => Math.ceil((priceCents * 1.25) / 100) * 100 - 1;

function stockFor(name, index) {
  if (index % 41 === 17) return 0; // a handful of sold-out items to exercise "out of stock" UI
  if (index % 23 === 5) return 2 + Math.floor(rand(`${name}-low`) * 4); // low stock
  return 12 + Math.floor(rand(`${name}-stock`) * 140);
}

async function main() {
  const categoryIds = {};
  for (const c of CATEGORIES) {
    const cat = await prisma.category.upsert({
      where: { slug: c.slug },
      update: {},
      create: { name: c.name, slug: c.slug, description: c.description, sortOrder: c.sortOrder, image: categoryImagePath(c.slug) },
    });
    categoryIds[c.slug] = cat.id;
  }

  const counters = {};
  let created = 0;
  let index = 0;

  for (const section of GROCERY_SECTIONS) {
    const cat = CATEGORIES.find((c) => c.slug === section.category);
    for (const [name, brand, price, unit, description, originKey] of section.items) {
      index++;
      counters[cat.slug] = (counters[cat.slug] || 0) + 1;
      const slug = slugify(name);
      const exists = await prisma.product.findUnique({ where: { slug }, select: { id: true } });
      if (exists) continue;
      await prisma.product.create({
        data: {
          name,
          slug,
          description,
          image: productImagePath(name),
          price: cents(price),
          compareAtPrice: index % 19 === 3 ? specialPrice(cents(price)) : null,
          unit,
          categoryId: categoryIds[cat.slug],
          subcategory: section.subcategory,
          brand,
          sku: `${cat.skuPrefix}-${String(counters[cat.slug]).padStart(4, '0')}`,
          origin: originKey ? ORIGIN[originKey] : cat.origin,
          inventory: stockFor(name, index),
          featured: FEATURED.has(name),
          popularity: Math.floor(rand(`${name}-pop`) * 400) + (FEATURED.has(name) ? 250 : 0),
        },
      });
      created++;
    }
  }

  let deliIndex = 0;
  for (const [name, originKey, subcategory, , description, portions] of DELI_ITEMS) {
    deliIndex++;
    const slug = slugify(name);
    const exists = await prisma.product.findUnique({ where: { slug }, select: { id: true } });
    if (exists) continue;
    const prices = portions.map(([, p]) => cents(p));
    await prisma.product.create({
      data: {
        name,
        slug,
        description,
        image: productImagePath(name),
        price: Math.min(...prices),
        unit: 'Freshly prepared',
        categoryId: categoryIds.deli,
        subcategory,
        brand: 'Wakis Mart Deli',
        sku: `DLI-${String(deliIndex).padStart(4, '0')}`,
        origin: ORIGIN[originKey],
        inventory: deliIndex === 13 ? 0 : 15 + Math.floor(rand(`${name}-deli`) * 30), // portions available today
        isDeli: true,
        featured: FEATURED.has(name),
        popularity: Math.floor(rand(`${name}-pop`) * 400) + (FEATURED.has(name) ? 300 : 0),
        portions: { create: portions.map(([label, p], i) => ({ label, price: cents(p), sortOrder: i })) },
      },
    });
    created++;
  }

  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@wakismart.local').toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || 'ChangeMe123!';
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: 'ADMIN' },
    create: { name: 'Wakis Mart Admin', email: adminEmail, passwordHash: await bcrypt.hash(adminPassword, 12), role: 'ADMIN' },
  });

  const total = await prisma.product.count();
  const deli = await prisma.product.count({ where: { isDeli: true } });
  console.log(`Seed complete: ${created} new products (${total} total, ${deli} deli items), admin user ${adminEmail}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
