import { env, stripeConfigured } from './config/env.js';
import { createApp } from './app.js';
import { prisma } from './utils/prisma.js';

const app = createApp();

const server = app.listen(env.port, () => {
  console.log(`\n🛒 Wakis Mart API running on http://localhost:${env.port}`);
  console.log(`   Client URL: ${env.clientUrl}`);
  if (!stripeConfigured()) console.log('   ⚠  STRIPE_SECRET_KEY not set — checkout will be disabled until it is configured.');
  else if (env.stripe.secretKey.startsWith('sk_live_')) console.log('   💳 Stripe LIVE mode');
  else console.log('   💳 Stripe test mode');
  if (!env.stripe.webhookSecret) console.log('   ⚠  STRIPE_WEBHOOK_SECRET not set — webhook events will be rejected.');
});

const shutdown = async () => {
  server.close();
  await prisma.$disconnect();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
