# waves4u: what the website has, checked against the spec

This file compares the current code with *waves4u Developer Specification* (31 Oct 2026). It follows the spec's section numbers.

**Status key**

| Mark | Meaning |
|---|---|
| ✅ | Built and tested |
| ⚠️ | Built, but needs real content, keys or a client decision before launch |
| ⏸️ | Built, but not tested on this machine |
| ❌ | Not built. Every ❌ item was left out on purpose, as agreed |

**Agreed exclusions:**
- Research calls, plus the live calls feed, trade log and real-time alerts that depend on them.
- `/market-analysis` URLs. Market analysis lives at `/analysis` instead.
- OTP login.
- WhatsApp.

---

## 1. Project overview

| Spec item | Status | Notes |
|---|---|---|
| Public marketing site | ✅ | |
| Paid subscription plans with online payment | ✅ | Razorpay. Needs live keys (see section 5) |
| Separate Free, Premium and Admin logins | ✅ | One login page. Each role lands on its own area |
| Member area and admin panel | ✅ | `/dashboard`, `/admin` |
| Callback form | ✅ | |
| Blogs, market analysis and videos | ✅ | |
| Legal pages, SEO, analytics | ✅ / ⚠️ | Legal wording is a draft. GA needs an ID |
| Hosting | ⚠️ | Docker Compose is ready. The client must choose a server or cloud host |

## 2. Sitemap

| Page | Spec URL | Built at | Status |
|---|---|---|---|
| Home (one page) | `/` | `/` | ✅ |
| Plans & Pricing | `/plans` | `/plans` (old `/pricing` redirects here) | ✅ |
| Blogs | `/blogs`, `/blogs/{slug}` | Same (old `/blog` redirects here) | ✅ |
| Market Analysis | `/market-analysis`, `/market-analysis/{slug}` | `/analysis` | ❌ URL not used, as agreed. The feature exists at `/analysis` |
| Videos | `/videos` | `/videos` | ✅ |
| Login / Sign up | `/login`, `/register`, `/forgot-password` | Same, plus `/reset-password` | ✅ Email and password login. OTP excluded |
| Member dashboard | `/dashboard` | `/dashboard/*` | ✅ |
| Admin panel | `/admin` | `/admin/*` | ✅ |
| Checkout | `/checkout/{plan}`, success and failure pages | `/checkout/[plan]`, `/checkout/success`, `/checkout/failure` | ✅ |
| Legal pages | `/privacy-policy`, `/terms`, `/disclaimer`, `/refund-policy`, `/disclosures` | Same | ⚠️ Draft text |
| Thank-you / 404 | `/thank-you`, `/404` | `/thank-you`, custom not-found page | ✅ |
| Top navigation | Home, About, Services, Plans, Blogs, Market Analysis, Videos, Contact, Login, Get a Callback | All present | ✅ |

## 3. Home page sections (spec order)

| # | Section | Status | What is there |
|---|---|---|---|
| 1 | Header | ✅ | Sticky header with logo, menu, Login and "Get a Callback". Hamburger menu below 768 px. After login it shows the user's name and a Dashboard link (Admin for admins) |
| 2 | Hero | ✅ | "RIDE EVERY WAVE", "Turning Waves into Wins", the individuals/families/businesses line and an intro paragraph. Two buttons: Book a Free Consultation goes to Contact, Explore Our Services goes to Services. Three highlight cards and a wave/chart illustration |
| 3 | About | ✅ / ⚠️ | The spec's exact text. Analyst photo, name and SEBI details are placeholders |
| 4 | Services | ✅ / ⚠️ | Four cards with an icon, title, description and 4-item checklist. Uses the spec's draft text |
| 5 | Plans | ✅ | Trade with us and waves4u club cards, each with a Subscribe button to checkout |
| 6 | Process | ✅ | Five stages with output labels. Horizontal timeline on desktop, vertical on mobile |
| 7 | Content | ✅ | Tabs for Blogs, Market Analysis and Videos. Shows the latest 3 of each with a "View all" link |
| 8 | Testimonials | ✅ / ⚠️ | Cards with first name, city and an initials avatar. A testimonial appears only when consent is ticked in admin. Demo entries need replacing |
| 9 | FAQ | ✅ / ⚠️ | Accordion with one item open at a time and FAQPage schema. Editable in admin. The client must supply the questions |
| 10 | Contact | ✅ / ⚠️ | Tap-to-call +91 84694 36766, embedded Google Map and the callback form. WhatsApp button excluded. Address, email and map link are placeholders |
| 11 | Footer | ✅ / ⚠️ | About line, links for Services, Plans, Content and Company, social icons, disclosures and disclaimer, © current year, legal links. Social URLs are placeholders |

## 4. Services

| Item | Status |
|---|---|
| Four cards: Trade with us (Advisory), waves4u club, Algo advisory, Mentorship (Education) | ✅ |
| Descriptions and checklists | ⚠️ Spec drafts are used until the client confirms them |

## 5. Plans and pricing

| Spec item | Status | Notes |
|---|---|---|
| Trade with us: choose a segment (Stock/Index F&O, Stock F&O, MCX, Futures), then a duration | ✅ | |
| Trade with us prices: 8,000 / 18,000 / 36,000 / 72,000, saving 25% | ✅ | |
| waves4u club prices: 899 / 2,100 / 4,200 / 8,400, saving 22% | ✅ | |
| Each card shows price, duration, saving vs monthly, what's included and Subscribe | ✅ | |
| Indian payment gateway (UPI, cards, net banking) | ✅ / ⚠️ | Razorpay is integrated and webhook-driven. Tested with signed test payloads only. A real payment needs live keys |
| GST invoice emailed automatically | ✅ / ⚠️ | CGST+SGST or IGST is chosen from the buyer's state. The invoice is emailed and printable from the dashboard. Needs company GSTIN and address |
| On payment, user becomes Premium for that plan and segment until expiry | ✅ | |
| Reminder emails 7 days and 1 day before expiry | ✅ | WhatsApp reminders excluded |
| Renewal and upgrade options in the dashboard | ✅ | |
| Admin edits prices, creates coupons and discounts without code changes | ✅ | Coupons can be percent or flat, with limits on products, durations, dates and uses |

## 6. Process

| Item | Status |
|---|---|
| Five stages (Market Scan → Review & Record) with their output labels | ✅ Shown as content on the home page |

## 7. User roles and logins

### Roles

| Role | Status | Notes |
|---|---|---|
| Free user | ✅ | Blogs, free analysis and videos, profile, plan purchase, callback request |
| Premium user | ✅ / ❌ | Has premium analysis and videos, club content with a club plan, invoices and renewal. Research calls, alerts and the trade log are excluded |
| Admin | ✅ / ❌ | Has every spec item except research calls and the trade log |

Access to each blog post, analysis post and video can be set to **Free**, **Premium** or **Club**. The server enforces this.

### Premium member area

| Spec item | Status |
|---|---|
| Live research calls feed | ❌ Excluded |
| Real-time alerts | ❌ Excluded |
| Member trade log with filters and stats | ❌ Excluded |
| Subscription status, expiry date, invoices, renewal button | ✅ |

### Admin panel

| Spec item | Status |
|---|---|
| Create, update and close research calls | ❌ Excluded |
| Manage users (change role, extend or cancel plan), plans, prices, coupons | ✅ Admins can also grant a plan manually and block a user |
| Publish blogs, market analysis and videos as Free or Premium | ✅ Club is a third option. Analysis updates keep their history |
| Callback leads with status (new, contacted, converted) and CSV export | ✅ Admins can also add notes |
| Reports: sign-ups, active subscribers, revenue by plan, renewals | ✅ Also includes revenue by month and leads |
| Extras beyond the spec | ✅ FAQs, testimonials, audit log, 2FA security page |

### Login security

| Spec item | Status | Notes |
|---|---|---|
| Email or mobile OTP login | ❌ | Excluded. Login uses email and password |
| Hashed passwords | ✅ | argon2 |
| Password reset | ✅ | One-time emailed link that expires |
| Session timeout | ✅ | 15-minute access token and 7-day refresh token. Logout and "log out everywhere" |
| Server-side role checks on every premium page and API | ✅ | |
| Admin two-factor authentication | ✅ | Authenticator-app 2FA. Required for admins by default |
| One active session per user | ✅ | A new login signs out the old device, which is told why |

## 8. Forms

### Get a Callback

| Spec item | Status |
|---|---|
| Name, 2–80 characters | ✅ |
| 10-digit Indian mobile, +91 optional | ✅ Also accepts spaces and dashes |
| Trading capital dropdown with the four ranges | ✅ |
| Consent checkbox with a Privacy Policy link | ✅ |
| Emails the team and saves the lead in admin | ✅ WhatsApp notification excluded |
| Redirects to `/thank-you` | ✅ |
| Spam protection: Cloudflare Turnstile plus honeypot | ✅ / ⚠️ Needs Turnstile keys. Only the honeypot works without them |
| Inline errors, loading state, typed data kept on error | ✅ |

### Other features

| Spec item | Status |
|---|---|
| WhatsApp floating button | ❌ Excluded |
| Cookie consent notice when analytics is used | ✅ GA4 loads only after the visitor accepts |

## 9. Design system

| Spec item | Status | Notes |
|---|---|---|
| Navy #0F2A4A, gold #C9A227, white and light-grey backgrounds, charcoal and grey text | ✅ | A darker gold is used for gold text on white so it meets contrast rules |
| Green and red profit/loss colours | ✅ | Defined as tokens. Their main use, call status, is excluded |
| Playfair Display headings, Inter body | ✅ | |
| One SVG icon set, no emoji | ✅ | Lucide |
| Breakpoints: mobile ≤767, tablet 768–1023, desktop 1024+, max width 1200 px | ✅ | |
| WCAG 2.1 AA contrast, focus states, field labels, alt text, keyboard menus and tabs | ✅ | Built to these rules. No formal audit has been run |
| Final colours and logo | ⚠️ | Waiting on the client |

## 10. Technical requirements

| Area | Status | Notes |
|---|---|---|
| Performance: Lighthouse 90+, LCP under 2.5 s, WebP/AVIF, lazy loading | ⏸️ | Lazy-loaded images and video, AVIF/WebP, fonts served locally. A Lighthouse score has not been measured |
| Real time: calls appear without refresh | ❌ | Excluded with research calls |
| Payments: webhooks activate, renew and expire plans; GST invoices | ✅ | A nightly job expires plans |
| SEO: meta per page, Open Graph, XML sitemap, robots.txt, clean URLs, premium content not indexed | ✅ | Dashboard and admin are set to noindex. Premium text never reaches non-members |
| Structured data: Organization, LocalBusiness, FAQPage, Article | ✅ | |
| Analytics: GA4 and Search Console, tracking callbacks, sign-ups and purchases | ✅ / ⚠️ | Needs the GA ID and Search Console code. WhatsApp click tracking excluded |
| Security: HTTPS, headers, rate limits, server-side checks, admin audit log | ✅ / ⚠️ | HTTPS comes from the proxy in front (Caddy, Nginx or Cloudflare) |
| Daily backups | ⏸️ | The worker runs `mongodump` daily and keeps 14 copies. The Docker image change has not been built here |
| Transactional email with SPF, DKIM and DMARC | ✅ / ⚠️ | Emails work through any SMTP provider. DNS records are set up at launch |
| Hosting with a staging site | ⚠️ | Docker Compose is ready. Staging is a second deployment |
| Compliance: SEBI number, analyst name, disclosures, disclaimer, refund policy, grievance contact, no promised returns | ⚠️ | Places for all of these exist with placeholders. The client and a compliance adviser must supply the wording |

## 11. Deliverables

| Item | Status |
|---|---|
| Public site, accounts, payments, member area, admin panel | ✅ |
| Source code | ✅ |
| Admin guide | ✅ Short guide in `docs/HANDOFF.md`. A PDF or video version has not been made |
| Design mockups (stage 1) | ❌ The site was built directly. No separate mockups |
| Domain, SSL, live payment mode, staging URL | ⚠️ Done at launch with the client's accounts |

### Spec open questions still waiting on the client

- Logo files and final brand colours
- SEBI registration type and number, analyst details, disclosure wording
- Final service descriptions and checklists
- Same Trade with us price for every segment? The current answer is yes, and buyers can purchase several segments.
- Are prices inclusive of GST? The code assumes they are. Also the refund policy.
- What is free and what is premium? Admins set this per post or video.
- Algo advisory and Mentorship: pricing, and are they sold online? They are currently enquiry-only through the callback form.
- Contact email, FAQ questions, testimonials, social links

---

## Summary

- **Built:** everything in the spec except the agreed exclusions.
- **Not built, as agreed:** research calls and the features that depend on them (live feed, real-time alerts, trade log), `/market-analysis` URLs, OTP login and WhatsApp.
- **Needed before launch:** real content and keys. See section 4 of `docs/HANDOFF.md` for the full list.
