import { LOW_STOCK_THRESHOLD } from './constants.js';

export function availabilityOf(product) {
  if (!product.isActive) return 'UNAVAILABLE';
  if (product.inventory <= 0) return 'OUT_OF_STOCK';
  if (product.inventory <= LOW_STOCK_THRESHOLD) return 'LOW_STOCK';
  return 'IN_STOCK';
}

export function serializeProduct(p, { admin = false } = {}) {
  const out = {
    id: p.id,
    name: p.name,
    slug: p.slug,
    description: p.description,
    image: p.image,
    price: p.price,
    compareAtPrice: p.compareAtPrice ?? null,
    unit: p.unit,
    brand: p.brand,
    sku: p.sku,
    subcategory: p.subcategory,
    origin: p.origin,
    inventory: p.inventory,
    availability: availabilityOf(p),
    featured: p.featured,
    isDeli: p.isDeli,
    isActive: p.isActive,
    popularity: p.popularity,
    category: p.category ? { id: p.category.id, name: p.category.name, slug: p.category.slug } : undefined,
    portions: p.portions
      ? [...p.portions].sort((a, b) => a.sortOrder - b.sortOrder).map((o) => ({ id: o.id, label: o.label, price: o.price }))
      : undefined,
  };
  if (admin) {
    out.createdAt = p.createdAt;
    out.updatedAt = p.updatedAt;
    out.categoryId = p.categoryId;
  }
  return out;
}

export function serializeOrder(o, { admin = false } = {}) {
  const out = {
    id: o.id,
    orderNumber: o.orderNumber,
    customerName: o.customerName,
    customerEmail: o.customerEmail,
    customerPhone: o.customerPhone,
    fulfillmentMethod: o.fulfillmentMethod,
    shippingAddress:
      o.fulfillmentMethod === 'DELIVERY'
        ? { line1: o.shippingLine1, line2: o.shippingLine2, city: o.shippingCity, state: o.shippingState, postalCode: o.shippingPostalCode }
        : null,
    notes: o.notes,
    subtotal: o.subtotal,
    tax: o.tax,
    deliveryFee: o.deliveryFee,
    total: o.total,
    currency: o.currency,
    paymentStatus: o.paymentStatus,
    status: o.status,
    paidAt: o.paidAt,
    refundedAmount: o.refundedAmount ?? 0,
    refundedAt: o.refundedAt ?? null,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
    items: (o.items || []).map((i) => ({
      id: i.id,
      productId: i.productId,
      productName: i.productName,
      portionLabel: i.portionLabel,
      image: i.image,
      sku: i.sku,
      unitPrice: i.unitPrice,
      quantity: i.quantity,
      lineTotal: i.lineTotal,
      productSlug: i.product?.slug ?? null,
    })),
  };
  if (admin) {
    out.userId = o.userId;
    out.stripeSessionId = o.stripeSessionId;
    out.stripePaymentIntentId = o.stripePaymentIntentId;
    out.billingName = o.billingName;
    out.billingAddress = o.billingAddress ? safeJson(o.billingAddress) : null;
    out.inventoryShortfall = o.inventoryShortfall;
    out.confirmationEmailSentAt = o.confirmationEmailSentAt ?? null;
  }
  return out;
}

function safeJson(s) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

export function serializeUser(u) {
  if (!u) return null;
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    phone: u.phone,
    address: { line1: u.addressLine1, line2: u.addressLine2, city: u.city, state: u.state, postalCode: u.postalCode },
    createdAt: u.createdAt,
  };
}
