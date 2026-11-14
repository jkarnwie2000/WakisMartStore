// Specials: a product is "on special" when compareAtPrice (its regular price) is set and price is lower.
// specialEndsAt is optional; once it passes, the regular price is restored automatically the next
// time catalogue or cart data is read (throttled sweep, so no background job is needed).
import { prisma } from '../utils/prisma.js';
import { logActivity } from './activity.js';

const SWEEP_EVERY_MS = 60 * 1000;
let lastSweep = 0;

export async function expireSpecials({ force = false } = {}) {
  if (!force && Date.now() - lastSweep < SWEEP_EVERY_MS) return 0;
  lastSweep = Date.now();
  const expired = await prisma.product.findMany({
    where: { specialEndsAt: { lte: new Date() }, compareAtPrice: { not: null } },
    select: { id: true, name: true, compareAtPrice: true },
  });
  if (!expired.length) return 0;
  await prisma.$transaction(
    expired.map((p) => prisma.product.update({ where: { id: p.id }, data: { price: p.compareAtPrice, compareAtPrice: null, specialEndsAt: null } })),
  );
  await logActivity(null, 'SPECIAL_EXPIRED', `${expired.length} special${expired.length === 1 ? '' : 's'} ended automatically: ${expired.map((p) => p.name).slice(0, 10).join(', ')}${expired.length > 10 ? '…' : ''}`, { entityType: 'SPECIAL' });
  return expired.length;
}

/** Discounts each product by percentOff from its regular price. Deli items (portion pricing) are skipped. */
export async function applySpecial(productIds, percentOff, endsAt) {
  const products = await prisma.product.findMany({ where: { id: { in: productIds } }, include: { portions: { select: { id: true } } } });
  const updates = [];
  const skipped = [];
  for (const p of products) {
    if (p.isDeli || p.portions.length) {
      skipped.push({ id: p.id, name: p.name, reason: 'Deli items use portion prices' });
      continue;
    }
    const regular = p.compareAtPrice ?? p.price;
    const sale = Math.max(1, Math.round((regular * (100 - percentOff)) / 100));
    if (sale >= regular) {
      skipped.push({ id: p.id, name: p.name, reason: 'Discount too small for this price' });
      continue;
    }
    updates.push({ product: p, regular, sale });
  }
  await prisma.$transaction(
    updates.map(({ product, regular, sale }) =>
      prisma.product.update({ where: { id: product.id }, data: { price: sale, compareAtPrice: regular, specialEndsAt: endsAt ?? null } }),
    ),
  );
  return { applied: updates.map(({ product, regular, sale }) => ({ id: product.id, name: product.name, regular, sale })), skipped };
}

/** Ends specials now, restoring each product's regular price. */
export async function endSpecials(productIds) {
  const products = await prisma.product.findMany({ where: { id: { in: productIds }, compareAtPrice: { not: null } }, select: { id: true, name: true, compareAtPrice: true } });
  await prisma.$transaction(
    products.map((p) => prisma.product.update({ where: { id: p.id }, data: { price: p.compareAtPrice, compareAtPrice: null, specialEndsAt: null } })),
  );
  return products.map((p) => ({ id: p.id, name: p.name, restoredPrice: p.compareAtPrice }));
}
