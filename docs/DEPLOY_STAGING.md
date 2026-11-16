# Free staging deployment (for client review)

This puts the whole site online for free, so the client can click through it, sign up, buy a plan with **test** money, and try the admin panel.

| Part | Service | Plan |
|---|---|---|
| Website (Next.js, `apps/web`) | Vercel | Hobby (free) |
| Backend API + scheduled jobs (`apps/api`) | Render | Free web service |
| Database | MongoDB Atlas | M0 (free, 512 MB) |
| Payments | Razorpay | Test Mode (no real money) |
| Email | Brevo | Free (300 emails/day) |
| Spam check (optional) | Cloudflare Turnstile | Free |
| Keep the API awake (optional) | cron-job.org | Free |

**How it fits together:**
- The browser only talks to the Vercel site.
- Vercel forwards every `/api/...` request to Render. Login cookies therefore stay on one site, and no CORS setup is needed.
- The Razorpay webhook also goes through the Vercel address.

Allow about an hour the first time. You will create five free accounts. None of them needs a card except Razorpay, which needs only a business sign-up for test mode.

---

## Before you start: put the code on GitHub

Vercel and Render deploy from a Git repository. Use a **private** repository.

```bash
cd waves4u
git init
git add .
git status        # check that NO .env or .env.local files are listed
git commit -m "chore: initial import"
git branch -M main
git remote add origin https://github.com/<you>/waves4u.git
git push -u origin main
```

`.gitignore` already excludes `.env`, `.env.local`, `node_modules`, `.next`, `dist` and `backups`.

Make one shared random key now. You will paste it into both Render and Vercel:

```bash
openssl rand -hex 32      # this is INTERNAL_API_KEY
```

---

## Step 1: Database (MongoDB Atlas)

1. Sign up at mongodb.com/atlas and create a **free M0** cluster. Choose provider **AWS** and region **Mumbai (ap-south-1)**.
2. Go to **Database Access** and add a user with a password. Use letters and numbers only, so nothing needs URL-encoding.
3. Go to **Network Access** and add `0.0.0.0/0` ("allow from anywhere"). Render's free plan has no fixed IP, so this is required. The database password still protects it.
4. Click **Connect → Drivers** and copy the connection string. Add the database name `waves4u` before the `?`:
   ```
   mongodb+srv://USER:PASS@cluster0.xxxxx.mongodb.net/waves4u?retryWrites=true&w=majority
   ```
   Atlas clusters are replica sets, so the payment transactions work as they are.

### Load plans, prices and the first admin

Run this from your laptop. Values typed on the command line take priority over your local `.env`.

```bash
cd apps/api
MONGO_URI="mongodb+srv://...the string above..." \
ADMIN_EMAIL="you@yourdomain.com" ADMIN_PASSWORD="a-strong-password" \
npm run seed

# Optional: sample FAQs and testimonials, so the home page is not empty.
# Remove them later with npm run unseed:demo.
MONGO_URI="mongodb+srv://..." npm run seed:demo
```

---

## Step 2: Razorpay test keys

1. Sign up at razorpay.com and switch the dashboard to **Test Mode** (toggle at the top).
2. Go to **Account & Settings → API Keys → Generate Test Key**. Copy the Key ID (`rzp_test_...`) and the secret.
3. The webhook is added in step 6, once the site address is known.

Test mode needs no KYC and moves no money.

## Step 3: Email (Brevo)

1. Sign up at brevo.com.
2. Go to **Senders, Domains & Dedicated IPs → Senders** and add and verify the address mail will come from, such as your Gmail address.
3. Go to **SMTP & API → SMTP** and copy the **login**, then create an **SMTP key**.
4. You will need these values:

| Variable | Value |
|---|---|
| `SMTP_HOST` | `smtp-relay.brevo.com` |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | the Brevo login |
| `SMTP_PASS` | the SMTP key |
| `MAIL_FROM` | `waves4u <the-verified-address>` |

If you skip email, the site still works. Emails are then only printed in the Render log. That includes password-reset links, so you can copy them from there.

## Step 4: Backend (Render)

1. Sign up at render.com with GitHub.
2. Click **New → Blueprint** and pick the repository. Render reads `render.yaml` from the repo root and creates **waves4u-api**.
3. Render asks for each value marked "sync: false":

| Variable | Value |
|---|---|
| `MONGO_URI` | Atlas string from step 1 |
| `CLIENT_URL` | `https://<project-name>.vercel.app`. Choose the Vercel project name now, such as `waves4u-staging`. You can fix it later |
| `INTERNAL_API_KEY` | the `openssl` value |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | from step 2 |
| `RAZORPAY_WEBHOOK_SECRET` | leave blank for now (step 6) |
| `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | from step 3 |
| `TEAM_EMAIL` | the inbox that should receive callback leads |
| `TURNSTILE_SECRET`, `YOUTUBE_CHANNEL_ID` | optional, can stay blank |

   The JWT secrets are generated automatically.
4. Click **Apply**. When the deploy is live, open `https://waves4u-api.onrender.com/health` (your URL may differ slightly). It should show `{"ok":true}`.

`render.yaml` already sets the staging-specific switches:
- `RUN_JOBS=true`: emails, renewal reminders, plan expiry and scheduled blog posts run inside the API, because the free plan has no separate worker.
- `BACKUP_ENABLED=false`
- `TRUST_PROXY=true`

## Step 5: Website (Vercel)

1. Sign up at vercel.com with GitHub.
2. Click **Add New → Project**, import the repository, and use the project name you chose for `CLIENT_URL`.
3. Under **Root Directory**, choose **`apps/web`**. Vercel detects Next.js automatically.
4. Under **Environment Variables**, add:

| Name | Value |
|---|---|
| `API_URL` | `https://waves4u-api.onrender.com` (your Render URL, no trailing slash) |
| `NEXT_PUBLIC_SITE_URL` | `https://<project-name>.vercel.app` |
| `INTERNAL_API_KEY` | the same `openssl` value as on Render |
| `SITE_NOINDEX` | `true`. Keeps the staging site out of Google |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | optional |
| `NEXT_PUBLIC_GA_ID` | leave empty on staging |

5. Click **Deploy**.

If the final Vercel address differs from what you put in `CLIENT_URL` on Render, update `CLIENT_URL` on Render. Render redeploys by itself. If `NEXT_PUBLIC_SITE_URL` was wrong, fix it and **Redeploy** on Vercel, because it is baked in at build time.

`apps/web/vercel.json` pins the site's server code to Mumbai (`bom1`).

## Step 6: Razorpay webhook

1. In the Razorpay dashboard (still in **Test Mode**), go to **Account & Settings → Webhooks → Add New Webhook**.
2. **URL:** `https://<project-name>.vercel.app/api/payments/webhook`
3. **Secret:** type a long random string.
4. **Events:** `payment.captured`, `payment.failed`, `order.paid`
5. Copy the same secret into **Render → waves4u-api → Environment → `RAZORPAY_WEBHOOK_SECRET`** and save. Render redeploys.

The webhook makes plans activate even if the buyer closes the tab after paying.

## Step 7 (recommended): keep the API awake

Render's free service sleeps after 15 minutes without traffic. The first visit after that waits 30–60 seconds, and in that time pages may show without their blog, video and plan data until you refresh. While asleep, scheduled jobs (reminders, expiry, email retries) also pause.

To avoid this, create a free job at cron-job.org:
- **URL:** `https://waves4u-api.onrender.com/health`
- **Schedule:** every 10 minutes

One service running all month fits inside Render's 750 free hours.

## Step 8 (optional): Turnstile

1. Go to the Cloudflare dashboard → **Turnstile → Add widget**.
2. **Hostname:** `<project-name>.vercel.app`
3. Put the **site key** in Vercel as `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and redeploy.
4. Put the **secret** in Render as `TURNSTILE_SECRET`.

Without it, only the hidden honeypot field protects the form.

---

## Step 9: First login

1. Open the Vercel site and log in with the `ADMIN_EMAIL` and `ADMIN_PASSWORD` you used for the seed.
2. You are sent to **Admin → Security**. Scan the QR code with Google Authenticator, Microsoft Authenticator or Authy, then enter the 6-digit code.
3. The admin panel unlocks after that. Change the password under **Profile**.

If the client should see the admin panel, give them their own admin user rather than sharing yours. Only one session per user is allowed, so sharing a login keeps signing the other person out.

## What to send the client

- **Site link:** `https://<project-name>.vercel.app`
- **Test payments:** at checkout, Razorpay shows a "Test Mode" banner and no money moves. Use UPI ID `success@razorpay` for a successful payment and `failure@razorpay` for a failed one. Test card numbers are in Razorpay's documentation ("Test Card Details").
- **Things to try:**
  - [ ] Home page on phone and desktop: all 11 sections, menu, tabs, FAQ
  - [ ] "Get a Callback": the lead appears under **Admin → Leads** and the team email arrives
  - [ ] Sign up, log out, use "Forgot password", reset email arrives
  - [ ] Buy **waves4u club monthly** with a coupon. Success page, invoice email, plan shown in **Dashboard → Billing**
  - [ ] Buy **Trade with us** for one segment. Plan shows that segment
  - [ ] Failed payment goes to the failure page and no plan is added
  - [ ] Premium/Club-only posts and videos are locked for a free user and open after buying
  - [ ] Log in on a second browser. The first one is signed out with an explanation
  - [ ] Admin: change a price, create a coupon, post a blog/analysis/video, edit FAQs, export leads CSV, view reports

## Staging limits

- **Slow first visit** after idle time, unless step 7 is done.
- **No database backups.** `mongodump` isn't on Render, and Atlas M0 has no backups. Do not keep anything important only on staging.
- **Vercel Hobby is for non-commercial use.** It is fine for a review copy. For the live site, use Vercel Pro or the Docker setup in `docs/HANDOFF.md`.
- **Indexing.** `SITE_NOINDEX=true` makes every page send `X-Robots-Tag: noindex`, and robots.txt blocks everything. Remove it only on the real production site.
- **Rate limiting.** `TRUST_PROXY=true` takes the visitor's address from the first `X-Forwarded-For` entry. Someone calling the Render URL directly could fake it to dodge rate limits. That is acceptable on staging. Production behind your own proxy uses `TRUST_PROXY=1`.

## Updating staging

Push to `main`. Vercel and Render both rebuild automatically.

## Troubleshooting

| Symptom | Fix |
|---|---|
| Pages load but blogs, plans or videos are empty | The API was asleep. Wait a minute and refresh, and set up step 7. Check that `API_URL` on Vercel is correct and has no trailing slash |
| Every visitor gets "Too many requests" | Make sure `TRUST_PROXY=true` is set on Render. Make sure `INTERNAL_API_KEY` is identical on Render and Vercel |
| Login succeeds but you appear logged out | `NEXT_PUBLIC_SITE_URL` or `CLIENT_URL` does not match the address in the browser. Fix them and redeploy |
| Payment succeeded but the plan did not activate | Check that the webhook URL is the Vercel address and that `RAZORPAY_WEBHOOK_SECRET` is identical in Razorpay and Render. Razorpay → Webhooks shows each delivery's response |
| Emails don't arrive | `MAIL_FROM` must be a sender verified in Brevo. Check the spam folder. The Render log shows each attempt |
| Render build fails at `tsc` | The build command must keep `--include=dev` (TypeScript is a dev dependency) |
| `MongoServerSelectionError` in the Render log | Atlas Network Access is missing `0.0.0.0/0`, or the password in `MONGO_URI` contains `@`, `/` or `:` and needs URL-encoding |
