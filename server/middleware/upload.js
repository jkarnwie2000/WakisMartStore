import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs/promises';
import { mkdirSync } from 'node:fs';
import multer from 'multer';
import { put } from '@vercel/blob';
import { SERVER_ROOT } from '../config/env.js';
import { badRequest } from '../utils/httpError.js';

export const UPLOAD_DIR = path.join(SERVER_ROOT, 'uploads');
// Serverless hosts (Vercel) have a read-only filesystem — uploads go to Vercel Blob there.
const useBlob = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);
if (!process.env.VERCEL) {
  try {
    mkdirSync(UPLOAD_DIR, { recursive: true });
  } catch {
    // ignore — local uploads simply won't be available
  }
}

// SVG is intentionally excluded (it can carry scripts).
const ALLOWED = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif' };

export const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED[file.mimetype]) cb(null, true);
    else cb(badRequest('Only JPG, PNG, WebP or GIF images are allowed.'));
  },
});

/** Stores an uploaded image and returns its public URL (Vercel Blob in production, local disk in development). */
export async function storeImage(file) {
  const filename = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ALLOWED[file.mimetype]}`;
  if (useBlob()) {
    const blob = await put(`products/${filename}`, file.buffer, { access: 'public', contentType: file.mimetype });
    return blob.url;
  }
  if (process.env.VERCEL) throw badRequest('Image uploads need a Vercel Blob store (BLOB_READ_WRITE_TOKEN is not set).');
  await fs.writeFile(path.join(UPLOAD_DIR, filename), file.buffer);
  return `/uploads/${filename}`;
}
