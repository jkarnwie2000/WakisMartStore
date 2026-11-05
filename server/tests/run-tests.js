// Test runner: creates a brand-new, throwaway SQLite database in the OS temp folder,
// applies the schema, seeds it, runs node:test, and removes the file afterwards.
// Your development database (server/prisma/dev.db) is never touched.
// Stripe API calls are not made — webhook events are signed locally with a test secret.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const serverDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dbFile = path.join(os.tmpdir(), `wakis-mart-test-${process.pid}-${Date.now()}.db`);
const env = {
  ...process.env,
  NODE_ENV: 'test',
  DATABASE_URL: `file:${dbFile.replace(/\\/g, '/')}`,
  STRIPE_SECRET_KEY: '',
  STRIPE_WEBHOOK_SECRET: 'whsec_test_wakis_mart_secret',
  JWT_SECRET: 'test-secret-test-secret-test-secret-123',
  ADMIN_EMAIL: 'admin@test.local',
  ADMIN_PASSWORD: 'AdminPass123',
  TAX_RATE: '0.07',
  DELIVERY_FEE: '7.99',
  FREE_DELIVERY_THRESHOLD: '75',
  DELIVERY_ENABLED: 'true',
  PICKUP_ENABLED: 'true',
};

const cleanup = () => {
  for (const f of [dbFile, `${dbFile}-journal`]) fs.rmSync(f, { force: true });
};
const run = (cmd, args) => {
  const r = spawnSync(cmd, args, { cwd: serverDir, env, stdio: 'inherit', shell: process.platform === 'win32' });
  if (r.status !== 0) {
    cleanup();
    process.exit(r.status ?? 1);
  }
};

run('npx', ['prisma', 'db', 'push', '--skip-generate']);
run('node', ['prisma/seed.js']);
const files = fs.readdirSync(path.join(serverDir, 'tests')).filter((f) => f.endsWith('.test.js')).map((f) => path.join('tests', f));
run('node', ['--test', '--test-concurrency=1', ...files]);
cleanup();
