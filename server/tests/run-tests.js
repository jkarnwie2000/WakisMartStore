// Test runner: creates a brand-new, uniquely named Postgres SCHEMA (e.g. wm_test_1234_1700000000000)
// inside the database from DATABASE_URL, applies the Prisma schema to it, seeds it, runs node:test,
// then drops only that temporary schema. Tables in your normal "public" schema are never touched.
// Stripe API calls are not made — webhook events are signed locally with a test secret.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const serverDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: path.join(serverDir, '..', '.env'), quiet: true });

if (!process.env.DATABASE_URL?.startsWith('postgres')) {
  console.error('DATABASE_URL must point to a PostgreSQL database to run the tests (see README → Database setup).');
  process.exit(1);
}

const schema = `wm_test_${process.pid}_${Date.now()}`;
const withSchema = (url) => {
  const u = new URL(url);
  u.searchParams.set('schema', schema);
  return u.toString();
};

const env = {
  ...process.env,
  NODE_ENV: 'test',
  DATABASE_URL: withSchema(process.env.DATABASE_URL),
  DATABASE_URL_UNPOOLED: withSchema(process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL),
  STRIPE_SECRET_KEY: '',
  STRIPE_WEBHOOK_SECRET: 'whsec_test_wakis_mart_secret',
  BLOB_READ_WRITE_TOKEN: '',
  JWT_SECRET: 'test-secret-test-secret-test-secret-123',
  ADMIN_EMAIL: 'admin@test.local',
  ADMIN_PASSWORD: 'AdminPass123',
  TAX_RATE: '0.07',
  DELIVERY_FEE: '7.99',
  FREE_DELIVERY_THRESHOLD: '75',
  DELIVERY_ENABLED: 'true',
  PICKUP_ENABLED: 'true',
};

const run = (cmd, args) => spawnSync(cmd, args, { cwd: serverDir, env, stdio: 'inherit', shell: process.platform === 'win32' }).status ?? 1;

const dropSchema = () =>
  run('node', ['--input-type=module', '-e', `import { PrismaClient } from '@prisma/client'; const p = new PrismaClient(); await p.$executeRawUnsafe('DROP SCHEMA IF EXISTS "${schema}" CASCADE'); await p.$disconnect();`]);

let status = run('npx', ['prisma', 'db', 'push', '--skip-generate']);
if (status === 0) status = run('node', ['prisma/seed.js']);
if (status === 0) {
  const files = fs.readdirSync(path.join(serverDir, 'tests')).filter((f) => f.endsWith('.test.js')).map((f) => path.join('tests', f));
  status = run('node', ['--test', '--test-concurrency=1', ...files]);
}
dropSchema();
process.exit(status);
