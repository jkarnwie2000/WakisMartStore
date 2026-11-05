import { ZodError } from 'zod';
import multer from 'multer';
import { HttpError } from '../utils/httpError.js';

export function notFoundHandler(req, res) {
  res.status(404).json({ error: `No API route for ${req.method} ${req.originalUrl}` });
}

export function errorHandler(err, req, res, _next) {
  if (err instanceof ZodError) {
    const details = err.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
    return res.status(400).json({ error: details[0]?.message || 'Invalid request.', details });
  }
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, details: err.details });
  }
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'Image must be 5 MB or smaller.' : err.message });
  }
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Malformed JSON body.' });
  }
  if (err?.code === 'P2002') {
    return res.status(409).json({ error: `A record with that ${err.meta?.target ?? 'value'} already exists.` });
  }
  if (err?.code === 'P2025') {
    return res.status(404).json({ error: 'Record not found.' });
  }
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on our end. Please try again.' });
}
