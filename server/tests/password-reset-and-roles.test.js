import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, client } from './helpers.js';
import { prisma } from '../utils/prisma.js';

const realFetch = globalThis.fetch;
let emails = [];
let srv;

// Capture Resend calls; everything else uses the real fetch.
before(async () => {
  globalThis.fetch = async (url, opts) => {
    if (String(url).startsWith('https://api.resend.com')) {
      emails.push(JSON.parse(opts.body));
      return new Response(JSON.stringify({ id: `email_${emails.length}` }), { status: 200 });
    }
    return realFetch(url, opts);
  };
  srv = await startServer();
});
beforeEach(() => {
  emails = [];
  process.env.RESEND_API_KEY = 're_test_key';
});
after(async () => {
  globalThis.fetch = realFetch;
  delete process.env.RESEND_API_KEY;
  await srv.close();
  await prisma.$disconnect();
});

const tokenFrom = (email) => email.text.match(/reset-password\?token=([a-f0-9]{64})/)[1];

test('forgot password emails a single-use reset link and lets the user set a new password', async () => {
  const api = client(srv.base);
  await api.post('/api/auth/register', { name: 'Efua Asante', email: 'efua@example.com', password: 'Original123' });

  const r = await api.post('/api/auth/forgot-password', { email: 'Efua@Example.com' });
  assert.equal(r.status, 200);
  assert.equal(emails.length, 1);
  assert.deepEqual(emails[0].to, ['efua@example.com']);
  const token = tokenFrom(emails[0]);

  const stored = await prisma.user.findUnique({ where: { email: 'efua@example.com' } });
  assert.notEqual(stored.passwordResetTokenHash, token, 'only a hash of the token is stored');
  assert.ok(stored.passwordResetExpiresAt > new Date());

  const weak = await api.post('/api/auth/reset-password', { token, password: 'short' });
  assert.equal(weak.status, 400);
  const ok = await api.post('/api/auth/reset-password', { token, password: 'BrandNew456' });
  assert.equal(ok.status, 200);

  // Token is single use
  assert.equal((await api.post('/api/auth/reset-password', { token, password: 'Another789' })).status, 400);
  // Old password no longer works; new one does
  assert.equal((await client(srv.base).post('/api/auth/login', { email: 'efua@example.com', password: 'Original123' })).status, 401);
  assert.equal((await client(srv.base).post('/api/auth/login', { email: 'efua@example.com', password: 'BrandNew456' })).status, 200);
});

test('a password reset signs out sessions that were already open', async () => {
  const device = client(srv.base);
  await device.post('/api/auth/register', { name: 'Yaw Darko', email: 'yaw@example.com', password: 'Original123' });
  assert.equal((await device.get('/api/auth/me')).data.user.email, 'yaw@example.com');

  await new Promise((r) => setTimeout(r, 1100)); // JWT iat has 1-second resolution
  await client(srv.base).post('/api/auth/forgot-password', { email: 'yaw@example.com' });
  await client(srv.base).post('/api/auth/reset-password', { token: tokenFrom(emails[0]), password: 'BrandNew456' });

  assert.equal((await device.get('/api/auth/me')).data.user, null, 'old session is revoked');
});

test('forgot password does not reveal whether an email has an account', async () => {
  const api = client(srv.base);
  const unknown = await api.post('/api/auth/forgot-password', { email: 'nobody-here@example.com' });
  const known = await api.post('/api/auth/forgot-password', { email: 'efua@example.com' });
  assert.equal(unknown.status, 200);
  assert.equal(unknown.data.message, known.data.message);
  assert.equal(emails.length, 1, 'only the real account gets an email');
});

test('expired and malformed reset tokens are rejected', async () => {
  const api = client(srv.base);
  await api.post('/api/auth/forgot-password', { email: 'efua@example.com' });
  const token = tokenFrom(emails[0]);
  await prisma.user.update({ where: { email: 'efua@example.com' }, data: { passwordResetExpiresAt: new Date(Date.now() - 1000) } });
  assert.equal((await api.post('/api/auth/reset-password', { token, password: 'BrandNew456' })).status, 400);
  assert.equal((await api.post('/api/auth/reset-password', { token: 'not-a-token', password: 'BrandNew456' })).status, 400);
});

test('changing your password keeps you signed in but signs out other devices', async () => {
  const phone = client(srv.base);
  const laptop = client(srv.base);
  await phone.post('/api/auth/register', { name: 'Abena Owusu', email: 'abena@example.com', password: 'Original123' });
  await laptop.post('/api/auth/login', { email: 'abena@example.com', password: 'Original123' });
  await new Promise((r) => setTimeout(r, 1100));
  assert.equal((await laptop.put('/api/auth/password', { currentPassword: 'Original123', newPassword: 'BrandNew456' })).status, 200);
  assert.equal((await laptop.get('/api/auth/me')).data.user.email, 'abena@example.com');
  assert.equal((await phone.get('/api/auth/me')).data.user, null);
});

test('admins can grant and remove admin access; customers and self-changes are blocked', async () => {
  const admin = client(srv.base);
  await admin.post('/api/auth/login', { email: 'admin@test.local', password: 'AdminPass123' });
  const staff = client(srv.base);
  await staff.post('/api/auth/register', { name: 'New Staff', email: 'staff@example.com', password: 'StaffPass123' });
  const staffUser = await prisma.user.findUnique({ where: { email: 'staff@example.com' } });
  const adminUser = await prisma.user.findUnique({ where: { email: 'admin@test.local' } });

  // New accounts are customers and cannot reach admin APIs or promote themselves
  assert.equal((await staff.get('/api/admin/users')).status, 403);
  assert.equal((await staff.patch(`/api/admin/users/${staffUser.id}/role`, { role: 'ADMIN' })).status, 403);

  const list = await admin.get('/api/admin/users?search=staff');
  assert.ok(list.data.users.some((u) => u.email === 'staff@example.com' && u.role === 'CUSTOMER'));

  const promote = await admin.patch(`/api/admin/users/${staffUser.id}/role`, { role: 'ADMIN' });
  assert.equal(promote.status, 200);
  assert.equal((await staff.get('/api/admin/stats')).status, 200, 'promoted user can use admin APIs');

  assert.equal((await admin.patch(`/api/admin/users/${adminUser.id}/role`, { role: 'CUSTOMER' })).status, 400, 'cannot change own role');

  const demote = await admin.patch(`/api/admin/users/${staffUser.id}/role`, { role: 'CUSTOMER' });
  assert.equal(demote.status, 200);
  assert.equal((await staff.get('/api/admin/stats')).status, 403);
});

test('the last administrator can never be demoted', async () => {
  const admin = client(srv.base);
  await admin.post('/api/auth/login', { email: 'admin@test.local', password: 'AdminPass123' });
  // Temporarily make a second admin, have them try to demote the original while it's the only other admin
  const helper = client(srv.base);
  await helper.post('/api/auth/register', { name: 'Helper', email: 'helper@example.com', password: 'HelperPass123' });
  const helperUser = await prisma.user.findUnique({ where: { email: 'helper@example.com' } });
  await admin.patch(`/api/admin/users/${helperUser.id}/role`, { role: 'ADMIN' });
  const adminUser = await prisma.user.findUnique({ where: { email: 'admin@test.local' } });
  assert.equal((await helper.patch(`/api/admin/users/${adminUser.id}/role`, { role: 'CUSTOMER' })).status, 200);
  // helper is now the only admin; nobody else can demote them, and they can't demote themselves
  assert.equal((await helper.patch(`/api/admin/users/${helperUser.id}/role`, { role: 'CUSTOMER' })).status, 400);
  assert.equal(await prisma.user.count({ where: { role: 'ADMIN' } }), 1);
  // restore for other tests
  await prisma.user.update({ where: { id: adminUser.id }, data: { role: 'ADMIN' } });
});
