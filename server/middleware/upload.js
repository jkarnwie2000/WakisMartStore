import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import multer from 'multer';
import { SERVER_ROOT } from '../config/env.js';
import { badRequest } from '../utils/httpError.js';

export const UPLOAD_DIR = path.join(SERVER_ROOT, 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// SVG is intentionally excluded (it can carry scripts).
const ALLOWED = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif' };

export const imageUpload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ALLOWED[file.mimetype]}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED[file.mimetype]) cb(null, true);
    else cb(badRequest('Only JPG, PNG, WebP or GIF images are allowed.'));
  },
});
