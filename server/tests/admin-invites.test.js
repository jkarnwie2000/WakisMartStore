import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, client } from './helpers.js';
import { prisma } from '../utils/prisma.js';

let srv;
let admin;
before(async () => {
  srv = await startServer();
  admin = client(srv.base);
  await admin.post('/api/auth/login', { email: 'admin@test.local', password: 'AdminPass123' });
});
after(async () => {
  await srv.close();
  await prisma.$disconnect();
});

const invite = async (body = {}) => (await admin.post('/api/admin/invites', body)).data;

test('an admin invite lets a new staff member sign up straight into an ADMIN account', async () => {
  const created = await invite({ note: 'Weekend manager' });
  assert.match(created.code, /^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
  assert.ok(created.link.endsWith(`/admin/register?code=${created.code}`));
  const stored = await prisma.adminInvite.findUnique({ where: { id: created.invite.id } });
  assert.notEqual(stored.codeHash, created.code, 'only a hash of the code is stored');

  const check = await client(srv.base).get(`/api/auth/admin-invite?code=${created.code}`);
  assert.equal(check.data.valid, true);
  assert.equal(check.data.invitedBy, 'Wakis Mart Admin');

  const staff = client(srv.base);
  const r = await staff.post('/api/auth/register-admin', { code: created.code.toLowerCase(), name: 'Weekend Manager', email: 'weekend@example.com', password: 'Manager123' });
  assert.equal(r.status, 201);
  assert.equal(r.data.user.role, 'ADMIN');
  assert.equal((await staff.get('/api/admin/stats')).status, 200, 'signed in as an admin immediately');

  // Single use
  const again = await client(srv.base).post('/api/auth/register-admin', { code: created.code, name: 'Someone Else', email: 'else@example.com', password: 'Someone123' });
  assert.equal(again.status, 400);
  assert.equal((await client(srv.base).get(`/api/auth/admin-invite?code=${created.code}`)).data.valid, false);

  const listed = (await admin.get('/api/admin/invites')).data.invites.find((i) => i.id === created.invite.id);
  assert.equal(listed.state, 'USED');
  assert.equal(listed.usedByEmail, 'weekend@example.com');
  const log = (await admin.get('/api/admin/activity?type=USER')).data.entries.map((e) => e.action);
  assert.ok(log.includes('ADMIN_INVITE_CREATED') && log.includes('ADMIN_INVITE_ACCEPTED'));
});

test('customer sign-up never creates admins, and customers cannot create invites', async () => {
  const shopper = client(srv.base);
  const r = await shopper.post('/api/auth/register', { name: 'Plain Shopper', email: 'plain@example.com', password: 'Shopper123', role: 'ADMIN' });
  assert.equal(r.data.user.role, 'CUSTOMER', 'role in the body is ignored');
  assert.equal((await shopper.post('/api/admin/invites', {})).status, 403);
  assert.equal((await client(srv.base).post('/api/admin/invites', {})).status, 401);
});

test('invalid, expired, revoked and email-locked invites are rejected', async () => {
  const anon = client(srv.base);
  assert.equal((await anon.post('/api/auth/register-admin', { code: 'AAAA-BBBB-CCCC', name: 'Nope', email: 'nope@example.com', password: 'Nope12345' })).status, 400);

  const expired = await invite();
  await prisma.adminInvite.update({ where: { id: expired.invite.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
  assert.equal((await anon.post('/api/auth/register-admin', { code: expired.code, name: 'Late', email: 'late@example.com', password: 'Late12345' })).status, 400);

  const revoked = await invite();
  assert.equal((await admin.post(`/api/admin/invites/${revoked.invite.id}/revoke`)).data.invite.state, 'REVOKED');
  assert.equal((await anon.post('/api/auth/register-admin', { code: revoked.code, name: 'Revoked', email: 'revoked@example.com', password: 'Revoked123' })).status, 400);

  const locked = await invite({ email: 'only-me@example.com' });
  assert.equal((await anon.get(`/api/auth/admin-invite?code=${locked.code}`)).data.email, 'only-me@example.com');
  assert.match((await anon.post('/api/auth/register-admin', { code: locked.code, name: 'Wrong', email: 'wrong@example.com', password: 'Wrong12345' })).data.error, /different email/);
  assert.equal((await anon.post('/api/auth/register-admin', { code: locked.code, name: 'Only Me', email: 'only-me@example.com', password: 'OnlyMe123' })).status, 201);
});

test('an existing customer account is upgraded only with its correct password', async () => {
  const customer = client(srv.base);
  await customer.post('/api/auth/register', { name: 'Shop Assistant', email: 'assistant@example.com', password: 'Assist123' });
  const inv = await invite();
  const wrong = await client(srv.base).post('/api/auth/register-admin', { code: inv.code, name: 'Shop Assistant', email: 'assistant@example.com', password: 'WrongPass1' });
  assert.equal(wrong.status, 401);
  assert.equal((await client(srv.base).get(`/api/auth/admin-invite?code=${inv.code}`)).data.valid, true, 'a failed attempt does not use up the invite');
  const ok = await client(srv.base).post('/api/auth/register-admin', { code: inv.code, name: 'Shop Assistant', email: 'assistant@example.com', password: 'Assist123' });
  assert.equal(ok.status, 200);
  assert.equal(ok.data.upgraded, true);
  assert.equal((await prisma.user.findUnique({ where: { email: 'assistant@example.com' } })).role, 'ADMIN');
});
