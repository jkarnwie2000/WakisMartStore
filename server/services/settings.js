// Effective store settings = values saved in the admin dashboard (StoreSettings row),
// falling back to the server environment for anything left blank.
// Cached briefly per server instance; saving settings clears this instance's cache immediately,
// and other serverless instances pick changes up within CACHE_MS.
import { prisma } from '../utils/prisma.js';
import { env } from '../config/env.js';

const CACHE_MS = 30 * 1000;
let cached = null;
let cachedAt = 0;

export function envDefaults() {
  const s = env.store;
  return {
    currency: s.currency,
    taxRate: s.taxRate,
    delivery: { ...s.delivery },
    pickup: { ...s.pickup },
    address: s.address,
    phone: s.phone,
    email: s.email,
    hours: s.hours,
    announcement: '',
  };
}

const pick = (value, fallback) => (value === null || value === undefined ? fallback : value);

export function mergeSettings(row) {
  const d = envDefaults();
  if (!row) return d;
  return {
    ...d,
    taxRate: pick(row.taxRate, d.taxRate),
    delivery: {
      enabled: pick(row.deliveryEnabled, d.delivery.enabled),
      feeCents: pick(row.deliveryFeeCents, d.delivery.feeCents),
      freeThresholdCents: pick(row.freeDeliveryThresholdCents, d.delivery.freeThresholdCents),
      note: pick(row.deliveryNote, d.delivery.note),
    },
    pickup: {
      enabled: pick(row.pickupEnabled, d.pickup.enabled),
      instructions: pick(row.pickupInstructions, d.pickup.instructions),
    },
    address: pick(row.storeAddress, d.address),
    phone: pick(row.storePhone, d.phone),
    email: pick(row.storeEmail, d.email),
    hours: pick(row.storeHours, d.hours),
    announcement: pick(row.announcement, d.announcement),
  };
}

export async function getStoreSettings({ fresh = false } = {}) {
  if (!fresh && cached && Date.now() - cachedAt < CACHE_MS) return cached;
  const row = await prisma.storeSettings.findUnique({ where: { id: 1 } });
  cached = mergeSettings(row);
  cachedAt = Date.now();
  return cached;
}

export function clearSettingsCache() {
  cached = null;
}
