import path from 'node:path';
import fs from 'node:fs';
import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env, PROJECT_ROOT } from './config/env.js';
import { attachUser } from './middleware/auth.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { UPLOAD_DIR } from './middleware/upload.js';
import { stripeWebhook } from './controllers/webhookController.js';
import { api } from './routes/index.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
          connectSrc: ["'self'"],
          formAction: ["'self'", 'https://checkout.stripe.com'],
          frameAncestors: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );

  // Stripe webhooks need the exact raw bytes for signature verification,
  // so this route is registered BEFORE the JSON body parser.
  app.post('/api/webhooks/stripe', express.raw({ type: 'application/json', limit: '1mb' }), stripeWebhook);

  app.use(express.json({ limit: '200kb' }));
  app.use(cookieParser());
  app.use(attachUser);

  app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '7d', fallthrough: false }));
  app.use('/api', api);
  app.use('/api', notFoundHandler);

  // In production the Express server also serves the built React app (single origin).
  const clientDist = path.join(PROJECT_ROOT, 'client', 'dist');
  if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist, { maxAge: env.isProduction ? '1h' : 0, index: false }));
    app.use((req, res, next) => {
      if (req.method !== 'GET' || req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  }

  app.use(errorHandler);
  return app;
}
