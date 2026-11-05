import crypto from 'node:crypto';

// e.g. WM-20261105-7K3Q9P — date prefix for humans, random suffix so numbers are not guessable.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateOrderNumber(date = new Date()) {
  const ymd = date.toISOString().slice(0, 10).replace(/-/g, '');
  const bytes = crypto.randomBytes(6);
  const suffix = [...bytes].map((b) => ALPHABET[b % ALPHABET.length]).join('');
  return `WM-${ymd}-${suffix}`;
}
