import Stripe from 'stripe';
import { env, stripeConfigured } from '../config/env.js';
import { HttpError } from '../utils/httpError.js';

let client = null;

// Lazily create the Stripe client so the rest of the app (browsing, cart, admin)
// works even before Stripe keys are configured.
export function getStripe() {
  if (!stripeConfigured()) {
    throw new HttpError(503, 'Online payments are not configured yet. Add STRIPE_SECRET_KEY to the server .env file.');
  }
  if (!client) {
    client = new Stripe(env.stripe.secretKey, { appInfo: { name: 'Wakis Mart', version: '1.0.0' } });
  }
  return client;
}

// Signature verification only needs the SDK's crypto helpers, not an API key.
const verifier = new Stripe('sk_test_signature_verification_only');

export function constructWebhookEvent(rawBody, signature) {
  if (!env.stripe.webhookSecret) {
    throw new HttpError(503, 'STRIPE_WEBHOOK_SECRET is not configured.');
  }
  return verifier.webhooks.constructEvent(rawBody, signature, env.stripe.webhookSecret);
}
