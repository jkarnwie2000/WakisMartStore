// Admin invitations: existing admins create one-time codes; new staff use them at /admin/register
// to create (or upgrade to) an ADMIN account. Customer sign-up (/register) never grants admin.
import crypto from 'node:crypto';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '../utils/prisma.js';
import { env } from '../config/env.js';
import { issueAuthCookie } from '../middleware/auth.js';
import { serializeUser } from '../utils/serializers.js';
import { badRequest, notFound, HttpError } from '../utils/httpError.js';
import { logActivity } from '../services/activity.js';
import { deliver, emailConfigured } from '../services/email.js';

// Unambiguous characters; 12 of them ≈ 60 bits, shown as XXXX-XXXX-XXXX.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const normalise = (code) => String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const hashCode = (code) => crypto.createHash('sha256').update(normalise(code)).digest('hex');
function newCode() {
  const chars = [...crypto.randomBytes(12)].map((b) => ALPHABET[b % ALPHABET.length]).join('');
  return `${chars.slice(0, 4)}-${chars.slice(4, 8)}-${chars.slice(8, 12)}`;
}
const inviteState = (i) => (i.revokedAt ? 'REVOKED' : i.usedAt ? 'USED' : i.expiresAt < new Date() ? 'EXPIRED' : 'ACTIVE');
const serializeInvite = (i) => ({
  id: i.id,
  email: i.email,
  note: i.note,
  createdByName: i.createdByName,
  createdAt: i.createdAt,
  expiresAt: i.expiresAt,
  usedAt: i.usedAt,
  usedByEmail: i.usedByEmail,
  revokedAt: i.revokedAt,
  state: inviteState(i),
});

async function findUsableInvite(code) {
  const n = normalise(code);
  if (n.length !== 12) return null;
  const invite = await prisma.adminInvite.findFirst({ where: { codeHash: hashCode(n) } });
  return invite && inviteState(invite) === 'ACTIVE' ? invite : null;
}

// ── Admin side ──────────────────────────────────────────────
const createSchema = z.object({
  email: z.union([z.literal(''), z.string().trim().toLowerCase().email('Please enter a valid email address.').max(160)]).optional(),
  note: z.string().trim().max(200).optional().or(z.literal('')),
  expiresInDays: z.coerce.number().int().min(1).max(30).default(7),
});

export async function createInvite(req, res) {
  const data = createSchema.parse(req.body ?? {});
  const code = newCode();
  const invite = await prisma.adminInvite.create({
    data: {
      codeHash: hashCode(code),
      email: data.email || null,
      note: data.note || null,
      createdById: req.user.id,
      createdByName: req.user.name,
      expiresAt: new Date(Date.now() + data.expiresInDays * 24 * 60 * 60 * 1000),
    },
  });
  const link = `${env.clientUrl}/admin/register?code=${code}`;
  let emailed = false;
  if (invite.email) {
    const html = `<p>Hi,</p><p>${req.user.name.replace(/[<>&]/g, '')} has invited you to manage the <strong>Wakis Mart Deli &amp; Grocery</strong> online store as an administrator.</p>
<p><a href="${link}" style="display:inline-block;background:#c2570f;color:#fff;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:999px">Create your admin account</a></p>
<p>Or go to ${env.clientUrl}/admin/register and enter the invite code <strong>${code}</strong>.</p>
<p>This invite works once and expires on ${invite.expiresAt.toUTCString()}. If you weren’t expecting it, you can ignore this email.</p>`;
    const text = `${req.user.name} has invited you to be a Wakis Mart administrator.\n\nCreate your admin account: ${link}\nInvite code: ${code}\n\nThis invite works once and expires on ${invite.expiresAt.toUTCString()}.`;
    emailed = (await deliver({ to: invite.email, subject: 'You’re invited to manage the Wakis Mart store', html, text, label: 'admin invite email' })).sent;
  }
  await logActivity(req, 'ADMIN_INVITE_CREATED', `Created an admin invite${invite.email ? ` for ${invite.email}` : ''} (expires ${invite.expiresAt.toISOString().slice(0, 10)})${invite.note ? ` — ${invite.note}` : ''}`, { entityType: 'USER', entityId: `invite-${invite.id}` });
  res.status(201).json({
    invite: serializeInvite(invite),
    code, // shown once — only its hash is stored
    link,
    emailed,
    emailEnabled: emailConfigured(),
  });
}

export async function listInvites(_req, res) {
  const invites = await prisma.adminInvite.findMany({ orderBy: { createdAt: 'desc' }, take: 50 });
  res.json({ invites: invites.map(serializeInvite) });
}

export async function revokeInvite(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) throw badRequest('Invalid id.');
  const invite = await prisma.adminInvite.findUnique({ where: { id } });
  if (!invite) throw notFound('Invite not found.');
  if (inviteState(invite) !== 'ACTIVE') throw badRequest('Only active invites can be revoked.');
  const updated = await prisma.adminInvite.update({ where: { id }, data: { revokedAt: new Date() } });
  await logActivity(req, 'ADMIN_INVITE_REVOKED', `Revoked an admin invite${invite.email ? ` for ${invite.email}` : ''}`, { entityType: 'USER', entityId: `invite-${id}` });
  res.json({ invite: serializeInvite(updated) });
}

// ── Public side (/admin/register) ───────────────────────────
const GENERIC_INVALID = 'This invite code is invalid, expired or has already been used. Ask an administrator for a new one.';

/** GET /api/auth/admin-invite?code= — lets the sign-up page check a code and pre-fill a restricted email. */
export async function checkInvite(req, res) {
  const invite = await findUsableInvite(req.query.code);
  if (!invite) return res.json({ valid: false, message: GENERIC_INVALID });
  res.json({ valid: true, email: invite.email, expiresAt: invite.expiresAt, invitedBy: invite.createdByName });
}

const registerSchema = z.object({
  code: z.string().trim().min(1, 'Enter your invite code.').max(40),
  name: z.string().trim().min(2, 'Please enter your name.').max(100),
  email: z.string().trim().toLowerCase().email('Please enter a valid email address.').max(160),
  password: z.string().min(8, 'Password must be at least 8 characters.').max(128).regex(/[A-Za-z]/, 'Password must contain a letter.').regex(/[0-9]/, 'Password must contain a number.'),
});

/** POST /api/auth/register-admin — creates an ADMIN account (or upgrades an existing account) using a valid invite. */
export async function registerAdmin(req, res) {
  const data = registerSchema.parse(req.body);
  const invite = await findUsableInvite(data.code);
  if (!invite) throw new HttpError(400, GENERIC_INVALID);
  if (invite.email && invite.email !== data.email) throw new HttpError(400, `This invite was issued for a different email address. Use the email it was sent to.`);

  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) {
    // Upgrading an existing account requires proving ownership with its current password.
    const ok = await bcrypt.compare(data.password, existing.passwordHash);
    if (!ok) throw new HttpError(401, 'An account with this email already exists. Enter that account’s current password to upgrade it to admin.');
  }

  // Claim the invite atomically so it can only ever be used once, even with simultaneous requests.
  const claimed = await prisma.adminInvite.updateMany({
    where: { id: invite.id, usedAt: null, revokedAt: null, expiresAt: { gt: new Date() } },
    data: { usedAt: new Date(), usedByEmail: data.email },
  });
  if (claimed.count === 0) throw new HttpError(400, GENERIC_INVALID);

  const user = existing
    ? await prisma.user.update({ where: { id: existing.id }, data: { role: 'ADMIN' } })
    : await prisma.user.create({ data: { name: data.name, email: data.email, passwordHash: await bcrypt.hash(data.password, 12), role: 'ADMIN' } });

  await logActivity(
    { user },
    'ADMIN_INVITE_ACCEPTED',
    `${user.name} (${user.email}) ${existing ? 'upgraded their account to admin' : 'created an admin account'} using an invite from ${invite.createdByName}`,
    { entityType: 'USER', entityId: user.id },
  );
  issueAuthCookie(res, user);
  res.status(existing ? 200 : 201).json({ user: serializeUser(user), upgraded: Boolean(existing) });
}
