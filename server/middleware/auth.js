import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { prisma } from '../utils/prisma.js';
import { unauthorized, forbidden } from '../utils/httpError.js';

export const AUTH_COOKIE = 'wm_token';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export function issueAuthCookie(res, user) {
  const token = jwt.sign({ sub: String(user.id), role: user.role }, env.jwtSecret, { expiresIn: '7d' });
  res.cookie(AUTH_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.isProduction,
    maxAge: MAX_AGE_MS,
    path: '/',
  });
}

export function clearAuthCookie(res) {
  res.clearCookie(AUTH_COOKIE, { httpOnly: true, sameSite: 'lax', secure: env.isProduction, path: '/' });
}

// Attaches req.user when a valid session cookie is present. Never rejects the request.
export async function attachUser(req, _res, next) {
  const token = req.cookies?.[AUTH_COOKIE];
  if (!token) return next();
  try {
    const payload = jwt.verify(token, env.jwtSecret);
    const user = await prisma.user.findUnique({ where: { id: Number(payload.sub) } });
    if (user) req.user = user;
  } catch {
    // invalid / expired token — treat as signed out
  }
  next();
}

export function requireAuth(req, _res, next) {
  if (!req.user) return next(unauthorized());
  next();
}

export function requireAdmin(req, _res, next) {
  if (!req.user) return next(unauthorized());
  if (req.user.role !== 'ADMIN') return next(forbidden());
  next();
}
