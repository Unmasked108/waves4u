# waves4u

SEBI-registered Elliott Wave advisory platform: public site, premium members area, admin panel, Razorpay payments.

```
waves4u/
├─ apps/
│  ├─ api/   Backend: Express + TypeScript + MongoDB   (port 4000)   → has its own README
│  └─ web/   Frontend: Next.js (React) + TypeScript    (port 3000)   → has its own README
├─ docker-compose.yml   whole stack in containers (production-style)
└─ package.json         shortcut scripts only
```
The two apps are fully separate projects (own `package.json`, own `.env`, own `node_modules`).
They only talk over HTTP: the browser calls the website, and the website forwards `/api/*` to the backend.

```
Browser ──► web (Next.js :3000) ──/api/*──► api (Express :4000) ──► MongoDB
                                               ▲
                                  worker (cron) ┘   YouTube sync · expire subscriptions · publish scheduled blog
Razorpay ──webhook──► api
```

## Run it locally (4 terminals)

Needs Node 20+ and Docker Desktop (for MongoDB).

```bash
npm run setup                       # installs both apps
cp apps/api/.env.example apps/api/.env      # Windows: copy ...   then fill in secrets + Razorpay TEST keys
cp apps/web/.env.example apps/web/.env.local
npm run db                          # 1) MongoDB (wait ~20s)
npm run seed                        #    plans, markets, admin user
npm run dev:api                     # 2) backend  → http://localhost:4000/health
npm run dev:worker                  # 3) background jobs
npm run dev:web                     # 4) website  → http://localhost:3000
```
Admin login (from the seed): `admin@waves4u.test` / `ChangeMe#12345`. **Change it in `.env` before seeding anywhere real.**

## Try the whole flow
1. Open the site, register a free account → dashboard. Levels, full blog posts and sessions are locked.
2. Log in as admin → `/admin`: publish an analysis, write a blog post, create a session.
3. As the free user, open the post: you only get the teaser. The API never sends the rest.
4. Go to Plans → Pay with a Razorpay **test** card/UPI → you become premium and the locked content opens.
5. Admin → User management: search, block/unblock, grant premium manually. Audit log records it.

Razorpay setup: add your test keys to `apps/api/.env`, and in the Razorpay dashboard add a webhook
`https://<your-domain>/api/payments/webhook` (event `payment.captured`, `payment.failed`) with the same secret as `RAZORPAY_WEBHOOK_SECRET`.
For local webhooks use a tunnel (ngrok / Cloudflare Tunnel). The browser "verify" step also activates the plan, so local testing works without a webhook.

## Not built yet (space is left for it)
OTP / email verification and notifications (fields + `notify()` outbox exist), admin 2FA, device limit,
image upload (analysis charts use an image URL for now), rich-text editor (blog body is HTML in a textarea),
auto-renew, tests for the frontend, real legal pages and SEBI details (placeholders in the footer).

## Before going live
Real secrets and Razorpay live keys, HTTPS (Caddy/Nginx + Cloudflare), nightly `mongodump` to off-server storage,
error monitoring, and a SEBI-compliance review of disclaimers, fee rules and record-keeping.
