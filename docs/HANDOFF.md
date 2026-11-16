# waves4u: handoff and deployment guide

This covers what was built against the *waves4u Developer Specification* (31 Oct 2026), how to run and deploy it, and what the client still has to confirm.

## 1. What is in scope

| Spec area | Where it lives |
|---|---|
| Home page, 11 sections in spec order (header, hero, about, services, plans, process, content tabs, testimonials, FAQ, contact, footer) | `apps/web/src/app/page.tsx` |
| Plans and pricing (Trade with us with segments, waves4u club; 4 durations; saving vs monthly) | `/plans`, `components/PlanCards.tsx`, API `GET /api/plans` |
| Checkout with segment, GST billing details, coupons, Razorpay; success and failure pages | `/checkout/[plan]`, `/checkout/success`, `/checkout/failure` |
| Blogs (free by default; Free/Premium/Club per post) | `/blogs`, `/blogs/[slug]` |
| Market analysis (Free/Premium/Club per post) | `/analysis`. The URL is kept as `/analysis`, as agreed |
| Videos: embedded YouTube/Vimeo, per-video access | `/videos`, `components/VideoPlayer.tsx` |
| Login, register, forgot/reset password, admin 2FA, one active session per user | `/login`, `/register`, `/forgot-password`, `/reset-password` |
| Member dashboard: plans, expiry, renew/upgrade, invoices, printable GST invoice, profile | `/dashboard/*` |
| Admin panel: reports, leads + CSV, users (role/extend/cancel/grant), payments, plans & prices, coupons, blogs, analysis, videos, FAQs, testimonials, sessions, audit log, 2FA | `/admin/*` |
| Get a Callback form (validation, honeypot, Turnstile, team email, `/thank-you`) | `components/CallbackForm.tsx`, API `POST /api/leads` |
| Legal pages | `/privacy-policy`, `/terms`, `/disclaimer`, `/refund-policy`, `/disclosures` |
| Custom 404 | `app/not-found.tsx` |
| SEO: per-page meta, Open Graph, sitemap.xml, robots.txt, Organization/LocalBusiness/FAQPage/Article schema | `app/layout.tsx`, `app/sitemap.ts`, `app/robots.ts` |
| GA4 (after consent) with events: generate_lead, sign_up, login, begin_checkout, purchase, video_play | `components/Consent.tsx`, `lib/analytics.ts` |
| Transactional email (welcome, password reset, GST invoice, renewal reminders 7 days and 1 day before expiry, lead alert) | `apps/api/src/services/mailer.ts`, worker |
| Security headers, rate limits, server-side role checks, audit log, daily backups | `next.config.mjs`, `apps/api/src/app.ts`, `services/backup.ts` |

**Not built, as agreed:** research calls (and the trade log and real-time alerts that depend on them), `/market-analysis` URLs, OTP login, WhatsApp. The data model and the notification outbox leave room to add these later.

## 2. Run locally

```bash
npm run setup                 # installs apps/api and apps/web
npm run db                    # MongoDB in Docker (replica set: payments use transactions)
cp apps/api/.env.example apps/api/.env      # then fill it in
cp apps/web/.env.example apps/web/.env.local
npm run seed                  # spec plans and prices, markets, first admin; also migrates v1 data
npm run seed:demo             # optional sample content (remove with npm run unseed:demo)
npm run dev:api & npm run dev:worker & npm run dev:web
```

With `SMTP_HOST` empty, emails are not sent. They are printed in the API log instead (password-reset links included).

**First admin login:** log in with `ADMIN_EMAIL` / `ADMIN_PASSWORD`. You are sent to **Admin → Security (2FA)** to scan a QR code with an authenticator app. The admin panel unlocks after that. Change the seed password straight away.

## 3. Production checklist

> For a free review copy for the client (Vercel + Render + Atlas, Razorpay test mode) follow **`docs/DEPLOY_STAGING.md`** instead.

1. **Hosting.** `docker compose up -d --build` from the repo root starts mongo, api, worker and web. Put Caddy, Nginx or Cloudflare in front for HTTPS. Use a separate staging deployment for client review.
2. **Environment.** Fill every value in both `.env.example` files. Use long random JWT secrets. Put a random `INTERNAL_API_KEY` in a `.env` file next to `docker-compose.yml`; compose passes it to both api and web. Keep `RUN_JOBS=false` (the worker container runs the jobs), `TRUST_PROXY=1` and `SITE_NOINDEX` empty. Set `NEXT_PUBLIC_SITE_URL` before `next build`, because it is baked into canonical URLs and the sitemap.
3. **Razorpay.**
   - Use live keys.
   - Add a webhook to `https://<site>/api/payments/webhook` for the events `payment.captured`, `payment.failed` and `order.paid`, and copy the secret into `RAZORPAY_WEBHOOK_SECRET`.
   - The webhook is the source of truth: plans activate even if the buyer closes the browser.
4. **Email.** Use an SMTP provider (SES, Postmark, Brevo, Zoho…). Set **SPF, DKIM and DMARC** for the sending domain, and set `TEAM_EMAIL` to the inbox that should receive callback leads.
5. **GST invoices.** Set `COMPANY_NAME`, `COMPANY_ADDRESS`, `COMPANY_STATE`, `COMPANY_GSTIN` and `SEBI_REG_NO`. CGST+SGST is applied when the buyer is in the same state as the seller, otherwise IGST.
6. **Spam protection.** Create a Cloudflare Turnstile widget and set `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (web) and `TURNSTILE_SECRET` (api).
7. **Analytics.** Set `NEXT_PUBLIC_GA_ID`, then verify the domain in Search Console and submit `/sitemap.xml`.
8. **Backups.** The worker runs `mongodump` daily at 02:30 IST into the `backups` volume and keeps 14 copies. Sync that folder off-site (S3, Backblaze or Drive) with rclone or similar, and test a restore with `mongorestore --gzip --archive=<file>`.
9. **YouTube.** Set `YOUTUBE_CHANNEL_ID`. New uploads appear every 30 minutes as free videos, and admins can change their access later.

## 4. Things the client must confirm (placeholders in the code)

All of these live in **`apps/web/src/lib/site.ts`** unless noted:

- SEBI registration type and number, analyst name and photo, BSE enlistment, compliance/grievance officer
- Office address, Google Maps embed link, contact email, social links
- Final service descriptions and checklists (spec section 4 drafts are in use)
- Whether prices include GST (the code assumes they do), and the **refund policy** (`app/(legal)/refund-policy`)
- Legal page wording. All five pages are drafts with highlighted placeholders, and need review by a compliance adviser
- FAQ questions and testimonials (managed in the admin panel; demo ones are prefixed `[Demo]` / `(demo)`)
- Final brand colours and fonts (tokens at the top of `apps/web/src/app/globals.css`)

## 5. Admin quick guide

- **Leads:** change status (New → Contacted → Converted), add notes, **Export CSV**.
- **Users:** search, change role, block/unblock, and **Plans & payments** to grant, extend or cancel plans and see invoices.
- **Plans & prices:** edit price, name or days, or hide a plan. Changes apply to new purchases immediately.
- **Coupons:** percent or flat, limited to products/durations, dates and maximum uses, pause or delete.
- **Content:** blogs, analysis and videos each have *Free / Premium / Club*. Analysis is never edited in place; **Post update** keeps history.
- **FAQs / Testimonials:** shown on the home page. A testimonial appears only when consent is ticked.
- **Reports:** sign-ups, active subscribers by product and segment, revenue by plan and month, new vs renewal, leads.
- **Audit log:** every admin action with time and actor.

## 6. Tests

```bash
cd apps/api && npm test        # unit tests: signatures, GST, savings, coupons, TOTP, video links, phone numbers
cd apps/api && npm run typecheck
cd apps/web && npx tsc --noEmit && npm run build
```
