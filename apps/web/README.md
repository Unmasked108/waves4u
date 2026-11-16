# waves4u web (frontend)

Next.js 14 (App Router) + TypeScript. No UI library: styling is one file, `src/app/globals.css`
(blue/yellow brand tokens; `.lt` = white sections, `.alt` = blue sections).

```bash
cp .env.example .env.local     # API_URL=http://localhost:4000
npm install
npm run dev                    # http://localhost:3000   (backend must be running for real data)
npm run build && npm start     # production
```

## Design system (premium look, brand colours unchanged)
All styling lives in `src/app/globals.css`, organised as: tokens, type, header, buttons, cards, bento grid, hero, section styles, forms/tables, panels, light sections, empty/skeleton, footer, toast/modal, motion, responsive.
- **Bento grids:** `.bento` is a 12-column grid. Give items `s3 s4 s5 s6 s7 s8 s12` (width) and `r2 r3` (row span). They reflow to 2 columns on tablet and 1 on phones.
- **Scroll reveal:** wrap anything in `<Reveal delay={ms}>`. It fades and lifts once when scrolled into view, staggered by `delay`. Honors reduced-motion.
- **Page transition:** `src/app/template.tsx` fades each page in on navigation.
- **Primitives:** `SectionHead` (eyebrow, title, lead), `Skeleton` (loading shapes), `Notice` (toast), `Modal` (animated dialog), `Empty` (empty state).
- **Cards:** `.card` is static; add `.lift` only for clickable cards (hover raises them), `.hov` for a subtle border hover.
- **Motion rules:** only `opacity` and `transform` are animated, 300-700ms, ease-out curve, and all of it switches off for visitors who prefer reduced motion.
- **Colours:** the brand palette is in `:root` at the top of the file. Change colours there only.

## How it talks to the backend
`next.config.mjs` forwards `/api/*` to `API_URL`. The browser therefore only talks to the website, so login
cookies are first-party (no CORS setup). Two helpers:
- `src/lib/server.ts` → `sget()` for server components. Forwards the visitor's cookie so the API decides what they may see.
- `src/lib/client.ts` → `api()` for client components (forms, dashboards, admin).

## Where things are
| Path | What it is |
|---|---|
| `src/app/page.tsx` | Home: hero with logo, analysis, theory, blog, videos, mentorship, plans |
| `src/app/analysis`, `blog`, `blog/[slug]`, `videos`, `pricing` | Public pages (server-rendered, good for SEO). The blog post page shows the teaser or the full post depending on what the API returns |
| `src/app/login`, `register` | Auth forms |
| `src/app/dashboard/*` | Member area: overview, analysis, blog, mentorship, subscription + invoices |
| `src/app/admin/*` | Admin: stats, user management, blog, analysis (with "post update"), sessions, audit log |
| `src/lib/auth.tsx` | Login state (`useAuth`), silent token refresh |
| `src/components/Plans.tsx` | Plan cards and the Razorpay Checkout flow |
| `src/components/Shell.tsx` | Sidebar layout + redirect guard for dashboard/admin |
| `src/components/Cards.tsx`, `WaveSketch.tsx` | Analysis / blog / video cards, wave sketch |
| `public/logo.png`, `logo-mark.png`, `src/app/icon.png` | Brand logo files and favicon |

**Important:** hiding things in the UI is only cosmetic. Premium content never reaches a free user because the
API removes it (`apps/api/src/routes/content.ts`). The admin pages are also protected by the API's role check.
