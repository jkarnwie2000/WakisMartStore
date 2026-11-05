import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '../utils/prisma.js';
import { issueAuthCookie, clearAuthCookie } from '../middleware/auth.js';
import { serializeUser } from '../utils/serializers.js';
import { HttpError, conflict } from '../utils/httpError.js';

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
  await prisma.user.update({ where: { id: req.user.id }, data: { passwordHash: await bcrypt.hash(data.newPassword, 12) } });
  res.json({ ok: true });
}
