import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '../utils/prisma.js';
import { issueAuthCookie, clearAuthCookie } from '../middleware/auth.js';
import { serializeUser } from '../utils/serializers.js';
import { HttpError, conflict } from '../utils/httpError.js';
import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { emailConfigured, sendPasswordReset } from '../services/email.js';

const email = z.string().trim().toLowerCase().email('Please enter a valid email address.').max(160);
const password = z
  .string()
  .min(8, 'Password must be at least 8 characters.')
  .max(128)
  .regex(/[A-Za-z]/, 'Password must contain a letter.')
  .regex(/[0-9]/, 'Password must contain a number.');

const registerSchema = z.object({ name: z.string().trim().min(2, 'Please enter your name.').max(100), email, password });
const loginSchema = z.object({ email, password: z.string().min(1, 'Password is required.').max(128) });
const opt = (max) => z.string().trim().max(max).optional().or(z.literal('')).transform((v) => v || null);
const profileSchema = z.object({
  name: z.string().trim().min(2).max(100),
  phone: opt(30),
  address: z
    .object({ line1: opt(120), line2: opt(120), city: opt(80), state: opt(80), postalCode: opt(20) })
    .optional(),
});
const passwordSchema = z.object({ currentPassword: z.string().min(1), newPassword: password });

// A constant hash used when the email doesn't exist so login timing doesn't reveal accounts.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);

export async function register(req, res) {
  const data = registerSchema.parse(req.body);
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw conflict('An account with this email already exists. Try signing in.');
  const user = await prisma.user.create({
    data: { name: data.name, email: data.email, passwordHash: await bcrypt.hash(data.password, 12), role: 'CUSTOMER' },
  });
  issueAuthCookie(res, user);
  res.status(201).json({ user: serializeUser(user) });
}

export async function login(req, res) {
  const data = loginSchema.parse(req.body);
  const user = await prisma.user.findUnique({ where: { email: data.email } });
  const ok = await bcrypt.compare(data.password, user?.passwordHash || DUMMY_HASH);
  if (!user || !ok) throw new HttpError(401, 'Incorrect email or password.');
  issueAuthCookie(res, user);
  res.json({ user: serializeUser(user) });
}

export function logout(_req, res) {
  clearAuthCookie(res);
  res.json({ ok: true });
}

export function me(req, res) {
  res.json({ user: serializeUser(req.user) });
}

export async function updateProfile(req, res) {
  const data = profileSchema.parse(req.body);
  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: {
      name: data.name,
      phone: data.phone,
      ...(data.address && {
        addressLine1: data.address.line1,
        addressLine2: data.address.line2,
        city: data.address.city,
        state: data.address.state,
        postalCode: data.address.postalCode,
      }),
    },
  });
  res.json({ user: serializeUser(user) });
}

export async function changePassword(req, res) {
  const data = passwordSchema.parse(req.body);
  const ok = await bcrypt.compare(data.currentPassword, req.user.passwordHash);
  if (!ok) throw new HttpError(400, 'Your current password is incorrect.');
  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: { passwordHash: await bcrypt.hash(data.newPassword, 12), passwordChangedAt: new Date() },
  });
  // Other devices are signed out (their sessions predate passwordChangedAt); keep this one signed in.
  issueAuthCookie(res, user);
  res.json({ ok: true });
}

// ── Password reset ──────────────────────────────────────────────
const RESET_TTL_MINUTES = 60;
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');
const GENERIC_RESET_MESSAGE = 'If an account exists for that email, we’ve sent a link to reset your password. Check your inbox (and spam folder).';

/** POST /api/auth/forgot-password — always answers the same way, so it can't reveal which emails have accounts. */
export async function forgotPassword(req, res) {
  const { email: address } = z.object({ email }).parse(req.body);
  const user = await prisma.user.findUnique({ where: { email: address } });
  if (user) {
    const token = crypto.randomBytes(32).toString('hex');
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordResetTokenHash: hashToken(token), passwordResetExpiresAt: new Date(Date.now() + RESET_TTL_MINUTES * 60 * 1000) },
    });
    const resetUrl = `${env.clientUrl}/reset-password?token=${token}`;
    await sendPasswordReset({ to: user.email, name: user.name, resetUrl, expiresMinutes: RESET_TTL_MINUTES });
  }
  res.json({ ok: true, message: GENERIC_RESET_MESSAGE, emailEnabled: emailConfigured() });
}

/** POST /api/auth/reset-password — sets a new password using a valid, unexpired, single-use token. */
export async function resetPassword(req, res) {
  const data = z.object({ token: z.string().regex(/^[a-f0-9]{64}$/, 'This reset link is invalid.'), password }).parse(req.body);
  const user = await prisma.user.findFirst({ where: { passwordResetTokenHash: hashToken(data.token) } });
  if (!user || !user.passwordResetExpiresAt || user.passwordResetExpiresAt < new Date()) {
    throw new HttpError(400, 'This reset link is invalid or has expired. Please request a new one.');
  }
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await bcrypt.hash(data.password, 12),
      passwordResetTokenHash: null,
      passwordResetExpiresAt: null,
      passwordChangedAt: new Date(), // signs out every existing session
    },
  });
  res.json({ ok: true, message: 'Your password has been reset. You can now sign in with your new password.' });
}
