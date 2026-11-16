import 'dotenv/config';
import { z } from 'zod';

const bool = (def: boolean) =>
  z.enum(['true', 'false', '1', '0']).optional().transform((v) => (v === undefined ? def : v === 'true' || v === '1'));

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  MONGO_URI: z.string(),
  /** Public URL of the website. Used for CORS and for links inside emails. */
  CLIENT_URL: z.string().default('http://localhost:3000'),
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  RAZORPAY_KEY_ID: z.string().default(''),
  RAZORPAY_KEY_SECRET: z.string().default(''),
  RAZORPAY_WEBHOOK_SECRET: z.string().default(''),
  YOUTUBE_CHANNEL_ID: z.string().default(''),
  ADMIN_EMAIL: z.string().default('admin@waves4u.test'),
  ADMIN_PASSWORD: z.string().default('ChangeMe#12345'),

  // Transactional email (any SMTP provider: Amazon SES, Postmark, Brevo, Zoho, Gmail Workspace...)
  SMTP_HOST: z.string().default(''),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().default(''),
  SMTP_PASS: z.string().default(''),
  MAIL_FROM: z.string().default('waves4u <no-reply@waves4u.com>'),
  /** Inbox that receives new callback leads. */
  TEAM_EMAIL: z.string().default(''),

  /** Cloudflare Turnstile secret. When empty, the captcha check is skipped (local development). */
  TURNSTILE_SECRET: z.string().default(''),

  /** Admins must use two-factor authentication before they can use the admin API. */
  ADMIN_2FA_REQUIRED: bool(true),
  /** Only one active login per user; logging in elsewhere signs out the older device. */
  SINGLE_SESSION: bool(true),

  // Seller details printed on GST invoices
  COMPANY_NAME: z.string().default('waves4u'),
  COMPANY_ADDRESS: z.string().default('Address to be confirmed'),
  COMPANY_STATE: z.string().default('Gujarat'),
  COMPANY_GSTIN: z.string().default(''),
  COMPANY_SAC: z.string().default('998399'),
  SEBI_REG_NO: z.string().default(''),

  // Hosting
  /** Run the scheduled jobs inside the API process instead of a separate worker (single free service). */
  RUN_JOBS: bool(false),
  /** Express "trust proxy": a number of proxy hops (default 1, e.g. behind Caddy/Nginx), or "true" to
   *  take the first X-Forwarded-For address (staging behind Vercel + Render, where the hop count varies). */
  TRUST_PROXY: z.string().default('1').transform((v) => (v === 'true' ? true : Number(v) || 1)),
  /** Shared secret the website's server sends with its own page-render requests so they are not
   *  counted against one shared rate-limit bucket. Set the same value as INTERNAL_API_KEY on the web. */
  INTERNAL_API_KEY: z.string().default(''),
});

export const env = schema.parse(process.env);
export const isProd = env.NODE_ENV === 'production';
