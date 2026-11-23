# Swagath Multicuisine Restaurant A/C — Kalikiri

Official website for Swagath Multicuisine Restaurant A/C, Kalikiri Cross Road, Andhra Pradesh: full menu, popular dishes, table / takeaway / delivery requests, catering enquiries, gallery, reviews, FAQ, contact and a staff dashboard.

Live: https://swagath-one.vercel.app/

## What's in it

| Part | Where | Notes |
|---|---|---|
| Public site | `public/index.html`, `public/app.js`, `public/*.css` | Plain HTML/CSS/JS, no build step |
| Staff dashboard | `public/admin.html` (not linked publicly, `noindex`) | Menu, specials, reviews, gallery, bookings, catering, logo and hero image |
| API | `server/api/**` | One file per route, served at `/api/...` |
| Server | `server/index.js` | Node built-ins only: static files, API routing, security headers, 404 page |
| Data | `server/store.js`, `server/hatchable.js` | JSON store in `.data/`, seeded from `migrations/` |
| Shared helpers | `server/lib/staff-auth.js`, `server/lib/validate.js` | Staff login tokens, form validation |
| Tests | `test/*.test.js` | Node's built-in test runner |

## Run it

Requires Node 22 (Node 20 works for the site; the test glob needs 21+).

```bash
npm run dev        # http://localhost:3000
npm test           # 28 tests: server, API, auth, HTML checks
```

Locally, staff login falls back to a development password and prints a warning. Set your own with `STAFF_USER` / `STAFF_PASSWORD` (see `.env.example`).

## Environment variables

See `.env.example`. Names only — never commit values.

- `STAFF_USER`, `STAFF_PASSWORD`: **required in production.** With `NODE_ENV=production` and no `STAFF_PASSWORD`, staff login is turned off (the API answers 503).
- `STAFF_SECRET`: optional signing key for staff tokens.
- `SWAGATH_DATA_DIR`: optional data folder (default `.data/`).

## Deploy (Vercel)

`vercel.json` uses `"framework": "container"`, so Vercel builds `Dockerfile.vercel` and runs `node server/index.js` on port 80. Before deploying this version, add `STAFF_USER` and `STAFF_PASSWORD` under Project → Settings → Environment Variables, or the staff dashboard can't log in.

**Data storage caveat:** bookings, enquiries and uploads are written to `.data/` inside the container. Container disks on Vercel are not permanent, so this data can be lost when the container restarts or is redeployed. For real use, connect a hosted database and file storage (for example Postgres + object storage) — see `docs/DECISIONS.md`.

## Security

- Security headers on every response (CSP, nosniff, frame options, referrer and permissions policy; HSTS in production). If you add a new third-party script, font, map or analytics service, add its origin to the CSP in `server/index.js`.
- Staff tokens are signed and expire after 12 hours; they no longer contain the password. Failed logins are rate limited per visitor.
- Booking and catering forms are validated on the server (phone, email, date, length limits).

## Accessibility

Targets WCAG 2.2 AA: skip link, `main` landmark, labelled form fields, visible focus rings, AA contrast, pause button for the rotating hero photos, `prefers-reduced-motion` respected. Checked with axe-core in a headless browser at desktop and phone sizes.

## Content honesty

Food and room photos are Unsplash stock images, not photos of the restaurant. Replace them with real photos from the staff dashboard (Gallery and Hero image) when available. Menu prices, phone numbers and reviews come from the restaurant's existing content and were not changed.

Originally built on Hatchable (https://hatchable.com); `hatchable.toml` is kept for that platform.
