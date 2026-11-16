import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { env } from './config.js';
import { errorHandler, notFound } from './middleware/error.js';
import adminRoutes from './routes/admin.js';
import authRoutes from './routes/auth.js';
import contentRoutes from './routes/content.js';
import paymentRoutes, { listPlans, webhook } from './routes/payments.js';

export function createApp() {
  const app = express();
  app.set('trust proxy', env.TRUST_PROXY); // behind Caddy/Nginx/Cloudflare, or Vercel + Render on staging
  app.use(helmet());
  app.use(cors({ origin: env.CLIENT_URL, credentials: true }));

  // The webhook needs the RAW body to verify the signature, so it is mounted BEFORE express.json().
  app.post('/api/payments/webhook', express.raw({ type: 'application/json', limit: '1mb' }), webhook);

  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  // Requests from the website's own server (page rendering for every visitor) all come from one
  // address; they carry the internal key and are not counted. Visitors' browser requests still are.
  const internal = (req: express.Request) => !!env.INTERNAL_API_KEY && req.get('x-internal-key') === env.INTERNAL_API_KEY;
  app.use(rateLimit({
    windowMs: 15 * 60 * 1000, limit: 600, standardHeaders: true, legacyHeaders: false, skip: internal,
    validate: { trustProxy: false }, // TRUST_PROXY=true is a deliberate staging choice
  }));

  app.get('/health', (_req, res) => res.json({ ok: true }));
  app.get('/api/plans', listPlans);
  app.use('/api/auth', authRoutes);
  app.use('/api/payments', paymentRoutes);
  app.use('/api', contentRoutes);
  app.use('/api/admin', adminRoutes);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
