// Loads environment variables from the project-root .env file (one level above /server).
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const SERVER_ROOT = path.resolve(__dirname, '..');
export const PROJECT_ROOT = path.resolve(SERVER_ROOT, '..');

dotenv.config({ path: path.join(PROJECT_ROOT, '.env'), quiet: true });

const num = (value, fallback) => {
  if (value === undefined || value === '') return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};
const bool = (value, fallback) => (value === undefined || value === '' ? fallback : /^(1|true|yes|on)$/i.test(value));

const isProduction = process.env.NODE_ENV === 'production';
const jwtSecret = process.env.JWT_SECRET || '';

if (isProduction && jwtSecret.length < 32) {
  throw new Error('JWT_SECRET must be set to a long random string (32+ characters) in production.');
}

export const env = {
  isProduction,
  isTest: process.env.NODE_ENV === 'test',
  port: num(process.env.SERVER_PORT || process.env.PORT, 4000),
  clientUrl: (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, ''),
  jwtSecret: jwtSecret || 'dev-only-insecure-secret-change-me',
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  },
  store: {
    currency: (process.env.CURRENCY || 'usd').toLowerCase(),
    taxRate: num(process.env.TAX_RATE, 0.07),
    delivery: {
      enabled: bool(process.env.DELIVERY_ENABLED, true),
      feeCents: Math.round(num(process.env.DELIVERY_FEE, 7.99) * 100),
      freeThresholdCents: Math.round(num(process.env.FREE_DELIVERY_THRESHOLD, 75) * 100),
      note:
        process.env.DELIVERY_NOTE ||
        'Delivery is available to local addresses. Our team will contact you to confirm your delivery window.',
    },
    pickup: {
      enabled: bool(process.env.PICKUP_ENABLED, true),
      instructions:
        process.env.PICKUP_INSTRUCTIONS ||
        'We will contact you when your order is ready for pickup. Please bring your order number.',
    },
    address: process.env.STORE_ADDRESS || '',
    phone: process.env.STORE_PHONE || '',
    email: process.env.STORE_EMAIL || '',
    hours: process.env.STORE_HOURS || '',
  },
};

export const stripeConfigured = () => Boolean(env.stripe.secretKey);
