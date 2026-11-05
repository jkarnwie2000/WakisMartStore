// Server-side source of truth for prices, stock checks and order totals.
// The client only ever sends product IDs, portion IDs and quantities.
import { prisma } from '../utils/prisma.js';
import { env } from '../config/env.js';
import { availabilityOf } from '../utils/serializers.js';
import { MAX_QTY_PER_LINE } from '../utils/constants.js';

/**
 * Resolves cart lines against the database.
 * @param {{productId:number, portionId?:number|null, quantity:number}[]} items
 * @returns {Promise<{lines:object[], issues:object[]}>}
 *   lines  — valid, priced lines (quantity may be clamped to available stock)
 *   issues — human-readable problems keyed to the original line
 */
export async function resolveCart(items) {
  const ids = [...new Set(items.map((i) => Number(i.productId)).filter(Number.isInteger))];
  const products = await prisma.product.findMany({
    where: { id: { in: ids } },
    include: { portions: true, category: { select: { slug: true, name: true } } },
  });
  const byId = new Map(products.map((p) => [p.id, p]));

  const lines = [];
  const issues = [];
  const requestedPerProduct = new Map();

  for (const raw of items) {
    const productId = Number(raw.productId);
    const portionId = raw.portionId == null ? null : Number(raw.portionId);
    const key = `${productId}:${portionId ?? ''}`;
    let quantity = Math.floor(Number(raw.quantity));
    const product = byId.get(productId);

    if (!product) {
      issues.push({ key, productId, portionId, type: 'NOT_FOUND', message: 'This product is no longer available.' });
      continue;
    }
    if (!product.isActive) {
      issues.push({ key, productId, portionId, type: 'UNAVAILABLE', message: `${product.name} is currently unavailable.` });
      continue;
    }

    let unitPrice = product.price;
    let portionLabel = null;
    if (product.portions.length > 0) {
      const portion = product.portions.find((o) => o.id === portionId);
      if (!portion) {
        issues.push({ key, productId, portionId, type: 'INVALID_PORTION', message: `Please choose a portion size for ${product.name}.` });
        continue;
      }
      unitPrice = portion.price;
      portionLabel = portion.label;
    } else if (portionId != null) {
      issues.push({ key, productId, portionId, type: 'INVALID_PORTION', message: `${product.name} does not have portion sizes.` });
      continue;
    }

    if (!Number.isInteger(quantity) || quantity < 1) {
      issues.push({ key, productId, portionId, type: 'INVALID_QUANTITY', message: `Invalid quantity for ${product.name}.` });
      continue;
    }
    if (quantity > MAX_QTY_PER_LINE) quantity = MAX_QTY_PER_LINE;

    // Stock is shared across all portion sizes of the same product.
    const alreadyRequested = requestedPerProduct.get(productId) || 0;
    const remaining = Math.max(0, product.inventory - alreadyRequested);
    if (remaining <= 0) {
      issues.push({ key, productId, portionId, type: 'OUT_OF_STOCK', message: `${product.name} is out of stock.` });
      continue;
    }
    if (quantity > remaining) {
      issues.push({
        key, productId, portionId, type: 'INSUFFICIENT_STOCK', available: remaining,
        message: `Only ${remaining} of ${product.name} available — quantity adjusted.`,
      });
      quantity = remaining;
    }
    requestedPerProduct.set(productId, alreadyRequested + quantity);

    lines.push({
      key,
      productId,
      portionId,
      name: product.name,
      slug: product.slug,
      sku: product.sku,
      image: product.image,
      portionLabel,
      unitPrice,
      quantity,
      lineTotal: unitPrice * quantity,
      inventory: product.inventory,
      availability: availabilityOf(product),
      isDeli: product.isDeli,
      category: product.category,
    });
  }
  return { lines, issues };
}

export function computeTotals(lines, fulfillmentMethod) {
  const subtotal = lines.reduce((sum, l) => sum + l.lineTotal, 0);
  const tax = Math.round(subtotal * env.store.taxRate);
  const { feeCents, freeThresholdCents } = env.store.delivery;
  let deliveryFee = 0;
  if (fulfillmentMethod === 'DELIVERY' && subtotal > 0) {
    deliveryFee = freeThresholdCents > 0 && subtotal >= freeThresholdCents ? 0 : feeCents;
  }
  return { subtotal, tax, deliveryFee, total: subtotal + tax + deliveryFee, taxRate: env.store.taxRate, currency: env.store.currency };
}
