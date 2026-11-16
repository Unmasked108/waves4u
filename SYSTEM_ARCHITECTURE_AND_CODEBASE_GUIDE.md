# waves4u — Complete Codebase & Database Architecture Guide

This guide explains **every folder**, **every file**, **how they talk to each other**, and **how the database tracks everything** in the `waves4u` platform in clear, simple language.

---

## 1. High-Level Overview: What is `waves4u`?

`waves4u` is a financial advisory and research platform focused on **Elliott Wave technical analysis**. It is built for a SEBI-registered research analyst to provide:
1. **Public content**: Educational articles, video analyses from YouTube, and teaser wave counts.
2. **Paid Premium Club**: Deep wave counts, exact trade levels (support, resistance, target, stop loss), complete weekly blogs, and live mentorship sessions.
3. **Razorpay Payments**: Integrated Indian checkout (UPI, Cards, Netbanking) with automated 18% GST calculation, sequential invoice generation, and subscription tracking.
4. **Admin Dashboard**: For publishing analyses, scheduling blogs, managing members, and auditing every administrative action.
5. **Background Worker**: A scheduled task runner that syncs YouTube videos, publishes scheduled blog posts, and expires overdue subscriptions.

---

## 2. System Architecture & Data Flow

```
[ Visitor / Member Browser ]
            │
            ▼ (port 3000)
    Frontend: Next.js (apps/web)
            │
            │  Rewrites all /api/* requests
            ▼ (port 4000)
    Backend: Express API (apps/api) ◄────── Background Worker (apps/api/src/worker.ts)
            │                                  (runs cron jobs for YouTube sync,
            ▼                                   blog publishing & subscription expiry)
    MongoDB (Replica Set: rs0)
```

### The Key Communication Secrets
1. **No CORS Issues (Next.js Proxy)**: The browser only connects to `http://localhost:3000`. In `apps/web/next.config.mjs`, any request starting with `/api/` is secretly forwarded under the hood to the backend at `http://localhost:4000/api/`. This means authentication cookies are **first-party**, immune to third-party cookie blocking.
2. **Server-Side Paywall**: Security does not happen by hiding buttons in React. In `apps/api/src/routes/content.ts`, if a visitor is not a paid member, sensitive fields (`levels`, blog `body`, session `joinLink`) are stripped completely out of the response **before leaving the server**. Even inspecting network packets or page source cannot reveal locked data.
3. **Idempotent Payments**: Payment fulfillment is atomic and runs inside a MongoDB transaction. If both the browser verification and the Razorpay server webhook hit the backend at the same time, the system guarantees only one activates the subscription and no duplicate invoice or wasted days occur.

---

## 3. Directory & File Breakdown

### Root Directory Files

| File | Purpose in Simple Words |
|---|---|
| `package.json` | Top-level shortcut file. Allows running one command from the project root (e.g. `npm run setup`, `npm run dev:api`, `npm run dev:web`) to operate both apps together without `cd`-ing into subfolders. |
| `docker-compose.yml` | Production-ready container orchestration file. Runs MongoDB (with a single-node replica set `rs0` required for transactions), the API server, the worker, and the Next.js frontend in Docker containers. |
| `README.md` | General project documentation explaining how to launch the project in 4 terminal tabs and test the user flow from free sign-up to premium upgrade. |

---

### Backend: `apps/api/`

The backend is built with **Node.js, Express, TypeScript, and Mongoose (MongoDB)**.

#### Configuration & Server Entrypoints

- **`src/config.ts`**:
  - Uses `zod` to validate environment variables upon startup (like `PORT`, `MONGO_URI`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `RAZORPAY_KEY_ID`, etc.). If a required environment secret is missing or too short, the server refuses to start with an immediate error message.
- **`src/db.ts`**:
  - Initializes the Mongoose connection to MongoDB. Configures `strictQuery: true` to prevent accidental query injections.
- **`src/app.ts`**:
  - Factory function `createApp()`. Configures security middleware (`helmet`, `cors`, `express-rate-limit`), mounts cookie parsing, and attaches route handlers.
  - **Crucial detail**: Mounts `/api/payments/webhook` with `express.raw()` **before** `express.json()`, because cryptographic signature validation requires the exact raw byte payload sent by Razorpay.
- **`src/server.ts`**:
  - Connects to the database and starts listening on the configured port (`4000`). Handles graceful shutdown signals (`SIGINT`, `SIGTERM`) to cleanly disconnect from MongoDB.
- **`src/worker.ts`**:
  - A background process driven by `node-cron`:
    - **Every 5 minutes**: Publishes scheduled blog posts whose `publishAt` time has arrived.
    - **Every 30 minutes**: Syncs recent YouTube uploads using the public RSS feed (no paid API key required).
    - **Every hour**: Marks expired subscriptions as `status: 'expired'`.

#### Data Models (`src/models/index.ts`)
Defines all MongoDB schemas and Mongoose models in one cohesive place. (Detailed in Section 4).

#### Middlewares (`src/middleware/`)

- **`auth.ts`**:
  - `resolveUser(req)`: Inspects incoming HTTP-only cookies (`at` = access token). If valid, looks up the user in MongoDB and checks if they have an active subscription or admin role to assign `req.user.isPremium`.
  - `authenticate`: Throws a 401 error if the user is not logged in.
  - `optionalAuth`: Allows both guests and logged-in users to proceed; attaches user info if present so routes can decide what content to show.
  - `requireRole('admin')`: Restricts administrative routes strictly to `admin` accounts.
  - `requirePremium`: Blocks free users from premium actions (like registering for mentorship workshops).
- **`error.ts`**:
  - `notFound`: Standard 404 JSON response for unmapped endpoints.
  - `errorHandler`: Global catch-all error middleware. Converts `ZodError` validation failures into 400s, `AppError` into their respective status codes, and code 11000 duplicate keys into 409 Conflict.

#### Utility Functions (`src/utils/`)

- **`errors.ts`**:
  - Defines the custom `AppError` class with HTTP status codes and a `wrap()` higher-order function that catches async promise rejections in Express routes and hands them to the error middleware.
- **`money.ts`**:
  - `gstSplit(totalPaise)`: Calculates reverse 18% GST split on GST-inclusive prices using integer math to eliminate floating-point rounding errors.
  - `slugify(text)`: Converts post titles into URL-safe slugs (e.g., `Gold Wave 3` -> `gold-wave-3`).
  - `escapeRegex(string)`: Escapes special characters before injecting user search terms into MongoDB regexes.
- **`signature.ts`**:
  - Cryptographic helpers using Node's native `crypto`:
    - `verifyCheckout`: Verifies Razorpay checkout signatures (`orderId|paymentId`) using `crypto.timingSafeEqual` to prevent timing attacks.
    - `verifyWebhook`: Verifies Razorpay webhook request body signatures against `RAZORPAY_WEBHOOK_SECRET`.

#### Business Services (`src/services/`)

- **`token.ts`**:
  - Issues and verifies dual JWT tokens:
    - **Access Token (`at`)**: Valid for 15 minutes, stored in an HttpOnly cookie.
    - **Refresh Token (`rt`)**: Valid for 7 days, contains a `tokenVersion` number (`tv`). If an admin blocks a user or the user clicks "Logout from all devices", `tokenVersion` is incremented in MongoDB, immediately invalidating all existing refresh tokens.
- **`subscription.ts`**:
  - `fulfilPayment(orderId, paymentId)`: Idempotent transaction runner. Marks the payment as `paid`, generates a sequential invoice number (`W4U-YYYY-XXXXX`), and adds the subscription duration. If the user already has an active subscription, it **stacks** the extra days onto the current end date without wasting a single day.
  - `grantSubscription(userId, planCode, days)`: Allows an admin to manually award premium access to a user (e.g. for customer support or offline payment).
  - `expireSubscriptions()`: Batch updates expired subscriptions to `expired`.
- **`razorpay.ts`**:
  - Singleton wrapper that instantiates the Razorpay SDK client with API keys.
- **`notifications.ts`**:
  - Implements the **Outbox Pattern**. Instead of calling external email/SMS providers directly in HTTP requests (which can fail or slow down requests), it writes a pending notification into the `NotificationOutbox` collection.
- **`youtube.ts`**:
  - Reads YouTube's public XML RSS feed for the configured channel ID using `fast-xml-parser`, parses the video IDs and titles, and does a `bulkWrite` upsert into the `Video` collection.
- **`audit.ts`**:
  - Logs administrative actions (who did what, to which record, and with what parameters) into the `AuditLog` collection.

#### API Routes (`src/routes/`)

- **`auth.ts`**:
  - `POST /register`: Registers a new user with Argon2 password hashing and logs them in.
  - `POST /login`: Authenticates credentials with Argon2 and issues HTTP-only cookies. Rate-limited to 20 attempts per 15 minutes.
  - `POST /refresh`: Silently rotates the 15-minute access token using the 7-day refresh token.
  - `POST /logout`: Clears browser cookies.
  - `POST /logout-all`: Increments `tokenVersion` in the DB and clears cookies, booting the user out of every session on all devices.
  - `GET /me`: Strict endpoint returning the logged-in user profile or a 401.
  - `GET /session`: Friendly endpoint called on page loads. Always returns HTTP 200 (returning `{ user: null }` for guests), preventing noisy 401 errors in browser logs, and silently auto-renews expired access tokens.
- **`payments.ts`**:
  - `GET /plans`: Returns active membership tiers.
  - `POST /order`: Creates a Razorpay order. The price is strictly looked up from MongoDB (preventing client-side tampering).
  - `POST /verify`: Fast-path verification called directly by the browser right after payment completes.
  - `POST /webhook`: Server-to-server webhook endpoint called by Razorpay. Source of truth for payment capture or failure.
  - `GET /mine`: Returns past payments and invoices for the logged-in member.
- **`content.ts`**:
  - `GET /blog`: Lists published blog posts (teaser only).
  - `GET /blog/:slug`: Fetches a single blog post. If the visitor is not premium, the `body` is stripped out.
  - `GET /analysis`: Lists active Elliott Wave analyses. Strips `levels` for non-members.
  - `GET /analysis/:id`: Fetches a single analysis with paywall enforcement.
  - `GET /markets`: Lists available market symbols and asset categories.
  - `GET /videos`: Returns synced YouTube videos.
  - `GET /sessions`: Lists upcoming mentorship sessions. Strips `joinLink` for non-members.
  - `POST /sessions/:id/register`: Allows a premium member to book a seat in a live session (respecting session capacity).
- **`admin.ts`**:
  - Protected by `authenticate` and `requireRole('admin')`.
  - `GET /stats`: Aggregates total users, active premium members, published posts, and total collected revenue.
  - `GET /users`: Paginated search and filtering of all registered users.
  - `GET /users/:id`: Details of a specific user with their subscription and payment records.
  - `PATCH /users/:id/status`: Blocks or unblocks a user (blocking increments `tokenVersion` to immediately kill active sessions).
  - `POST /users/:id/grant`: Manually awards a subscription to a user.
  - `POST /blog` & `PATCH /blog/:id`: Creates, sanitizes HTML, schedules, or updates blog articles.
  - `POST /analysis`: Publishes a new Elliott Wave analysis.
  - `POST /analysis/:id/update`: Implements **immutable versioning**. Rather than overwriting an existing published analysis, this marks the previous one as `supersededBy` and creates a new document linked to the old one.
  - `POST /sessions`: Schedules a new mentorship session.
  - `PATCH /plans/:code`: Updates plan price or toggles active status.
  - `GET /audit`: Returns the administrative audit history.

#### Seed Scripts & Tests
- **`src/seed.ts`**: Idempotently seeds standard plans (`monthly`, `yearly`), default markets (Nifty 50, Gold, Silver, Crude Oil, USD/INR), and the initial admin user.
- **`src/seed-demo.ts`**: Populates realistic mock data (demo analyses, blog posts, live workshops, videos) to preview the UI, with an `--clear` option (`npm run unseed:demo`) to clean it up.
- **`test/core.test.ts`**: Automated unit tests verifying Razorpay HMAC verification, GST mathematical calculations, and slug generation.

---

### Frontend: `apps/web/`

The frontend is built with **Next.js 14 (App Router), React 18, and TypeScript**. It uses pure, hand-crafted modern CSS in `src/app/globals.css` with zero third-party UI framework dependencies.

#### Root Configuration & Entrypoints

- **`next.config.mjs`**: Configures Next.js standalone output and sets up the rewrite rule mapping `/api/:path*` to `http://localhost:4000/api/:path*`.
- **`src/app/globals.css`**: The complete styling system. Contains brand color tokens (`--navy`, `--blue`, `--yellow`, `--amber`), typography, custom 12-column Bento grid system (`.bento`, `.s4`, `.s8`, `.s12`), interactive card hover states (`.lift`), buttons, modal styles, and responsive breakpoints.
- **`src/app/layout.tsx`**: Root layout wrapping the entire application in the `AuthProvider`, the cursor `Spotlight`, the universal `Header`, and the `Footer`.
- **`src/app/template.tsx`**: Runs on page navigation to provide a clean CSS fade-in animation between route changes.

#### State & Communication Libraries (`src/lib/`)

- **`types.ts`**: TypeScript definitions for frontend entities (`Analysis`, `BlogItem`, `Video`, `Plan`, `Session`, `Me`) and helper formatting functions (`inr()` for Indian Rupee currency and `fmtDate()`).
- **`server.ts`**:
  - `sget(path)`: Used in React Server Components. Performs server-side fetches directly to the API, forwarding the browser's incoming cookies so the backend can evaluate whether the visitor is premium before returning HTML.
- **`client.ts`**:
  - `api(path, options)`: Used in React Client Components (forms, buttons, interactive dashboards). Sends client-side requests through the `/api` proxy. If an access token expired mid-session (401), it calls `/auth/session` once to refresh the token and retries the request automatically.
- **`auth.tsx`**:
  - Context provider (`AuthProvider`) and React hook (`useAuth()`). Maintains current user state, provides `login()`, `register()`, `logout()`, and `reload()` functions across the entire client-side tree.

#### Reusable UI Components (`src/components/`)

- **`Header.tsx`**: Fixed top navbar. Detects window scroll to apply a blurred frosted glass background (`.scrolled`). Displays navigation links and switches between "Login / Join Premium" and "Dashboard / Logout" based on auth state. Contains a mobile hamburger drawer.
- **`Footer.tsx`**: Displays brand information, quick explore links, regulatory compliance placeholders (Investor Charter, Grievances, Smart ODR), and mandatory SEBI disclaimers.
- **`Cards.tsx`**:
  - `AnalysisCard`: Renders an Elliott Wave analysis card. If user is premium, displays target, support, resistance, and stop-loss levels. If free, displays a locked prompt linking to pricing.
  - `BlogCard`: Renders a blog preview card with category pills and teaser text.
  - `VideoCard` & `VideoRow`: YouTube video display cards featuring thumbnail, title, and direct link to YouTube.
  - `Empty`: Visual placeholder for sections with no data.
- **`WaveSketch.tsx`**: A responsive SVG generator that draws an illustrative 5-wave impulse or 3-wave correction diagram if an analysis doesn't have an uploaded chart image.
- **`Plans.tsx`**: Displays free and premium subscription pricing tiers. Loads Razorpay's JavaScript SDK (`checkout.js`) dynamically, creates an order via `/api/payments/order`, opens the native Razorpay modal, and handles the post-payment verification callback.
- **`Shell.tsx`**:
  - `Shell`: Unified sidebar layout for both `/dashboard` and `/admin` sections. Checks auth status and role; redirects unauthenticated visitors to `/login` and non-admins away from `/admin`.
  - `Lock`: Banner component indicating premium-only sections.
- **`Spotlight.tsx`**: Adds a subtle mouse-following radial glow inside hovered cards using CSS variables (`--mx`, `--my`) on pointer movements.
- **`Modal.tsx`**: Animated accessible pop-up dialog that supports clicking outside or pressing Escape to dismiss.
- **`Notice.tsx`**: Floating toast notification for error messages or success alerts that auto-dismisses after 4 seconds.
- **`Skeleton.tsx`**: Shimmer loading skeletons (`SkeletonCards`, `SkeletonTable`) displayed while data is being fetched.
- **`Reveal.tsx`**: Wraps any element to smoothly slide and fade into view using an `IntersectionObserver` when scrolled into viewport. Honors user's `prefers-reduced-motion` settings.
- **`SectionHead.tsx`**: Formats standardized section titles with small uppercase eyebrow text, main headings, accent highlights, and introductory lead paragraphs.

#### Application Pages (`src/app/`)

##### 1. Public Pages
- **`page.tsx` (Homepage)**: Server-rendered landing page showing the hero banner, market credibility statistics, featured Elliott Wave calls, educational theory Bento grid, latest blog articles, YouTube video showcase, mentorship perks, and pricing plans.
- **`login/page.tsx` & `register/page.tsx`**: Clean authentication forms for logging in and creating accounts with input validation and error feedback.
- **`pricing/page.tsx`**: Dedicated membership pricing page displaying plan cards and payment buttons.
- **`analysis/page.tsx`**: Public gallery of market analyses across Indices, Derivatives, Commodities, and Forex.
- **`blog/page.tsx` & `blog/[slug]/page.tsx`**: Blog index and single article page. On the single article page, if the post is locked, the reader sees the opening teaser and an upgrade card. If unlocked, the full HTML article is rendered.
- **`videos/page.tsx`**: Archive of synced YouTube market breakdown videos.

##### 2. Member Dashboard (`src/app/dashboard/`)
- **`layout.tsx`**: Wraps all dashboard pages inside the `Shell` sidebar with links: Overview, Analysis, Weekly Blog, Mentorship, and Subscription.
- **`page.tsx` (Overview)**: Welcomes the user, displays their current plan status and expiry date, and showcases recent market updates.
- **`analysis/page.tsx`**: Full analysis archive with unlocked premium levels.
- **`blog/page.tsx`**: Member archive of weekly educational market blogs.
- **`sessions/page.tsx`**: Upcoming live mentorship sessions where members can click to register and access meeting join links (Zoom/Google Meet).
- **`billing/page.tsx`**: Displays active subscription details and a table of past invoices with tax breakdown (taxable amount + GST) and invoice numbers.

##### 3. Admin Panel (`src/app/admin/`)
- **`layout.tsx`**: Wraps admin sections with the `admin` flag passed to `Shell` (enforcing server-side and client-side admin checks).
- **`page.tsx` (Overview)**: Real-time platform statistics showing total revenue collected, total users, active premium subscribers, and published articles.
- **`users/page.tsx`**: User management table with real-time search (name/email), status filter, and plan filter. Allows blocking/unblocking accounts and manually granting premium access via an interactive modal.
- **`analysis/page.tsx`**: Form to publish new Elliott Wave calls or click "Post update" on existing ones (creating superseding version-controlled entries).
- **`blog/page.tsx`**: Blog creation studio supporting immediate publishing, saving drafts, or scheduling for a future date/time.
- **`sessions/page.tsx`**: Interface for creating live mentorship workshops, specifying start time, meeting link, and attendee capacity.
- **`audit/page.tsx`**: Chronological audit trail showing every action performed by administrators.

---

## 4. How the Database Tracks Everything

All database schemas are declared in `apps/api/src/models/index.ts`. Here is how MongoDB tracks the complete system state:

### 1. `User` Collection
Tracks user identity, authentication, authorization, and session invalidation.
- Fields: `name`, `email` (unique, lowercase), `passwordHash` (Argon2), `role` (`user` | `admin`), `status` (`active` | `blocked`), `tokenVersion` (number), `emailVerifiedAt`, `phone`, `phoneVerifiedAt`.
- **How it tracks state**: Whenever an admin blocks a user (`status: 'blocked'`) or a user clicks "Logout from all devices", `tokenVersion` is incremented by 1. When the client attempts to use its refresh cookie, the token's embedded version doesn't match the database version, instantly killing the session.

### 2. `Plan` Collection
Tracks available pricing packages.
- Fields: `code` (e.g. `monthly`, `yearly`), `name`, `pricePaise` (integer paise, ₹999.00 = `99900`), `durationDays` (30 or 365), `active` (boolean).
- **How it tracks state**: Storing money in paise prevents floating-point rounding errors. During checkout, prices are strictly read from the database, preventing client-side price tampering.

### 3. `Subscription` Collection
Tracks access rights and subscription timelines for every user.
- Fields: `user` (ref User), `plan` (ref Plan), `startsAt`, `endsAt`, `status` (`active` | `expired` | `cancelled`), `source` (`payment` | `admin`), `payment` (ref Payment).
- **How it tracks state**:
  - The compound index `{ user: 1, status: 1, endsAt: -1 }` enables instant checks to verify if a user has active premium rights:
    `Subscription.exists({ user: userId, status: 'active', endsAt: { $gt: new Date() } })`
  - **Renewal stacking**: If a user has 10 days remaining and buys another 30 days, `startsAt` is set to the **existing** subscription's `endsAt`, so the user gets 40 full consecutive days without losing any time.

### 4. `Payment` Collection
Tracks commercial transaction logs, Razorpay references, and GST splits.
- Fields: `user` (ref User), `plan` (ref Plan), `razorpayOrderId`, `razorpayPaymentId`, `amountPaise`, `taxablePaise`, `gstPaise`, `currency`, `status` (`created` | `paid` | `failed`), `invoiceNo`, `paidAt`.
- **How it tracks state**: When an order is created, status starts as `'created'`. Once payment succeeds, status updates to `'paid'`, `paidAt` is set, and a sequential tax invoice is assigned.

### 5. `PaymentEvent` Collection (Webhook Idempotency)
Tracks raw webhook payloads received from Razorpay.
- Fields: `eventId` (unique from header), `type` (`payment.captured`), `payload` (raw JSON), `processed` (boolean).
- **How it tracks state**: If Razorpay retries sending an event, the system checks `processed: true` and avoids duplicate charges or extensions.

### 6. `Counter` Collection
Provides atomic counters for business documents.
- Fields: `_id: "invoice"`, `seq: number`.
- **How it tracks state**: Uses MongoDB's atomic `findByIdAndUpdate('invoice', { $inc: { seq: 1 } })` inside transactions so two simultaneous orders can never receive the same invoice number (e.g. `W4U-2026-00001`).

### 7. `Market` Collection
Stores tradable instruments (e.g., Nifty 50, Gold, Silver, Crude Oil, USD/INR) categorized by Index, Derivatives, Commodity, or Forex.

### 8. `Analysis` Collection
Tracks technical Elliott Wave research calls with **immutable version history**.
- Fields: `market`, `title`, `timeframe`, `waveCount`, `bias` (`Bullish` | `Bearish` | `Neutral`), `chartImageUrl`, `summary`, `levels` (support, resistance, target, stop loss, notes), `status` (`draft` | `published`), `publishedAt`, `supersedes`, `supersededBy`, `createdBy`.
- **How it tracks state**: When an analyst revises an analysis, the system does **not** edit the existing document. It creates a brand-new document pointing to the old one (`supersedes`), and updates the old one's `supersededBy` pointer. Querying `{ status: 'published', supersededBy: null }` guarantees users only see the freshest call while maintaining a tamper-proof audit trail of previous market calls.

### 9. `BlogPost` Collection
Tracks weekly market articles with teaser and rich HTML body.
- Fields: `title`, `slug`, `market`, `teaser`, `body`, `status` (`draft` | `scheduled` | `published`), `publishAt`, `publishedAt`, `author`.
- **How it tracks state**: If an article is set to `'scheduled'`, it stays invisible to visitors until `publishAt`. The background worker checks every 5 minutes for posts where `publishAt <= now` and flips them to `'published'`.

### 10. `MentorSession` Collection
Tracks live interactive mentorship sessions and attendee lists.
- Fields: `title`, `description`, `startsAt`, `joinLink` (premium only), `capacity`, `registrations` (array of user IDs).
- **How it tracks state**: Uses atomic updates with condition `{ $size: '$registrations' } < capacity` to prevent overbooking.

### 11. `Video` Collection
Caches the advisory's YouTube video archive (video ID, title, thumbnail, publishedAt). Upserted by the background worker using RSS.

### 12. `AuditLog` Collection
An immutable record of all administrative activities (actor, action, target, metadata, timestamp) for regulatory audit and compliance.

### 13. `NotificationOutbox` Collection
Queues outbound emails, SMS, WhatsApp messages, or OTP verification codes asynchronously.

---

## 5. Summary of Safety & Best Practices Implemented

1. **Integer Money**: All financial calculations use integer paise to eliminate rounding discrepancies.
2. **First-Party Cookies**: Next.js reverse proxy forwards API calls so cookies never face third-party browser restrictions.
3. **Argon2 Password Hashing**: Modern, memory-hard hashing resistant to GPU cracking.
4. **Instant Logout Everywhere**: `tokenVersion` in the user model invalidates all active sessions in one database write.
5. **Double Payment Safety**: Fast-path verification unlocks the UI instantly; the asynchronous webhook acts as the permanent source of truth.
6. **Zero Client-Side Leaks**: Non-premium visitors never receive locked content in network payloads.
7. **Versioned Analyses**: Market calls cannot be quietly modified after the fact; changes create new superseding records.
8. **Automated Maintenance**: Background worker handles expiration, YouTube updates, and scheduled publications automatically.
