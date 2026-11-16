# waves4u API (backend)

Part of the `waves4u` monorepo, see the root README for running everything together. This file covers the backend only.

Express + TypeScript + MongoDB (Mongoose) backend for the waves4u advisory platform:
auth, roles, Razorpay subscriptions, Elliott Wave analysis, weekly blog, mentorship sessions,
YouTube auto-sync, admin user management.

## Run it

```bash
cp .env.example .env        # fill in secrets + Razorpay test keys
docker compose up -d mongo  # MongoDB as a replica set (needed for transactions)
npm install
npm run seed                # plans, markets, admin user
npm run dev                 # API on :4000
npm run worker              # cron jobs (YouTube sync, expiry, scheduled blog)
npm test                    # signature + GST tests
```
Full stack in Docker: `docker compose up -d --build`.

## Rules the code enforces
1. **Paywall is server-side.** `routes/content.ts` strips blog `body`, analysis `levels` and session `joinLink`
   before responding to non-members. The frontend only renders what it receives.
2. **Webhook is the source of truth for payments.** `/api/payments/webhook` verifies the HMAC over the raw
   body, stores every event (unique `eventId`), and `fulfilPayment()` is idempotent and transactional.
3. **Prices come from the database**, never from the browser. Money is integer paise, GST-inclusive (18% split stored).
4. **Published analyses are never edited**, `POST /api/admin/analysis/:id/update` creates a superseding record.
5. **Every admin action is audited**; admin routes are role-checked on the server.
6. Blog HTML is sanitized; passwords use argon2; tokens live in httpOnly cookies; login is rate-limited.

## Endpoints
| Area | Endpoints |
|---|---|
| Auth | `POST /api/auth/register, login, refresh, logout, logout-all` · `GET /api/auth/me` |
| Plans/Payments | `GET /api/plans` · `POST /api/payments/order, verify, webhook` · `GET /api/payments/mine` |
| Public + member content | `GET /api/blog, /blog/:slug, /analysis, /analysis/:id, /videos, /sessions` · `POST /api/sessions/:id/register` (premium) |
| Admin | `/api/admin/stats, users, users/:id, users/:id/status, users/:id/grant, blog, analysis, sessions, plans/:code, audit` |

## Razorpay flow
1. Frontend `POST /api/payments/order {planCode}` → gets `orderId`, `keyId`, `amount`.
2. Open Razorpay Checkout with that order.
3. On success, frontend `POST /api/payments/verify` with the 3 Razorpay fields (fast path).
4. Razorpay also calls `/api/payments/webhook` (`payment.captured`), set this URL + secret in the Razorpay dashboard.
5. Whichever arrives first activates the subscription; the other is a no-op.

## Space left for later
- **OTP / email verification:** `User.emailVerifiedAt / phone / phoneVerifiedAt` exist; register already calls `notify()`.
- **Notifications:** `services/notifications.ts` writes to `NotificationOutbox`; add a worker job that sends pending rows.
- **Device limit, admin 2FA, auto-renew (Razorpay Subscriptions), image uploads (S3/R2).**

## Before going live
Real Razorpay keys + webhook secret, strong JWT secrets, HTTPS (Caddy/Nginx + Cloudflare), nightly `mongodump`
to off-server storage (test a restore), Sentry, and a SEBI-compliance review of disclaimers and fee rules.
