// Vercel serverless entry point: every /api/* request is rewritten here (see vercel.json)
// and handled by the same Express app used in local development.
import { createApp } from '../server/app.js';

export default createApp();
