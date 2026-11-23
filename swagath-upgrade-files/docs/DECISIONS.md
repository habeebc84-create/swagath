# Decisions

Short records of why things are the way they are.

## 2026-11-23 — Upgrade pass against the website-build skill

1. **Stay on plain HTML/CSS/JS + Node built-ins.** The site already works and has no build step or runtime dependencies. Migrating to React/Next.js would add risk with no gain for a one-page restaurant site.
2. **No 3D / WebGL.** A restaurant page sells with fast, appetising photos. A 3D scene would slow the first paint (LCP) on phones in Kalikiri's mobile networks and doesn't explain anything. The existing light canvas dot field stays.
3. **Staff auth moved to one shared module** (`server/lib/staff-auth.js`). The old default password was visible in this public repo and the token was `base64(user:password)`. Now: env credentials, signed expiring tokens, constant-time checks, login rate limit, and login disabled in production until `STAFF_PASSWORD` is set.
4. **Security headers in the Node server, not `vercel.json`.** The project runs as a Vercel container, so the server sets the headers itself — this also covers local runs. CSP keeps `'unsafe-inline'` for scripts because pages use inline JSON-LD, `onerror` image fallbacks and inline handlers in the admin page; removing it needs a larger refactor.
5. **Caching:** HTML/CSS/JS use `no-cache` + ETag (304 when unchanged) so a new push shows immediately; images get one day. The logo is never long-cached because staff can replace it.
6. **Open: persistent data.** `.data/` on a Vercel container is not durable. Needs a decision on a hosted database (e.g. Supabase/Neon Postgres) and file storage.
