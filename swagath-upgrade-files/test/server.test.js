import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startServer, postJson } from "./helpers.js";

let srv;
before(async () => { srv = await startServer({ STAFF_USER: "staff", STAFF_PASSWORD: "test-pass-123", NODE_ENV: undefined }); });
after(async () => { await srv.stop(); });

test("home page loads with security headers", async () => {
  const res = await fetch(srv.base + "/");
  assert.equal(res.status, 200);
  assert.match(res.headers.get("content-type"), /text\/html/);
  assert.match(res.headers.get("content-security-policy"), /default-src 'self'/);
  assert.match(res.headers.get("content-security-policy"), /frame-ancestors 'self'/);
  assert.equal(res.headers.get("x-content-type-options"), "nosniff");
  assert.equal(res.headers.get("x-frame-options"), "SAMEORIGIN");
  assert.ok(res.headers.get("referrer-policy"));
  assert.ok(res.headers.get("etag"));
});

test("unchanged files are answered with 304", async () => {
  const first = await fetch(srv.base + "/styles.css");
  const etag = first.headers.get("etag");
  const second = await fetch(srv.base + "/styles.css", { headers: { "if-none-match": etag } });
  assert.equal(second.status, 304);
});

test("images are cached for a day, the swappable logo is not", async () => {
  const icon = await fetch(srv.base + "/icon-192.png");
  assert.match(icon.headers.get("cache-control"), /max-age=86400/);
  const logo = await fetch(srv.base + "/swagath-logo.png");
  assert.equal(logo.headers.get("cache-control"), "no-cache");
});

test("unknown pages get the branded 404 page", async () => {
  const res = await fetch(srv.base + "/does-not-exist");
  assert.equal(res.status, 404);
  const html = await res.text();
  assert.match(html, /isn't on the menu/);
});

test("path traversal is refused", async () => {
  const res = await fetch(srv.base + "/%2e%2e/package.json");
  assert.ok([403, 404].includes(res.status), `got ${res.status}`);
});

test("non-GET requests to static files are rejected", async () => {
  const res = await fetch(srv.base + "/index.html", { method: "POST" });
  assert.equal(res.status, 405);
});

test("robots.txt and sitemap.xml point at the live site", async () => {
  const robots = await (await fetch(srv.base + "/robots.txt")).text();
  assert.match(robots, /Sitemap: https:\/\/swagath-one\.vercel\.app\/sitemap\.xml/);
  assert.match(robots, /Disallow: \/admin\.html/);
  const sm = await fetch(srv.base + "/sitemap.xml");
  assert.equal(sm.status, 200);
  assert.match(await sm.text(), /<loc>https:\/\/swagath-one\.vercel\.app\/<\/loc>/);
});

test("public menu API works", async () => {
  const res = await fetch(srv.base + "/api/menu/list");
  assert.equal(res.status, 200);
});

test("table booking: valid request is saved", async () => {
  const r = await postJson(srv.base + "/api/bookings/create", {
    name: "Test Guest", phone: "083400 03444", party_size: 4,
    booking_date: "2030-01-15", booking_time: "7:30 PM", booking_mode: "table"
  });
  assert.equal(r.status, 200, JSON.stringify(r.data));
  assert.equal(r.data.success, true);
  assert.equal(r.data.booking.party_size, 4);
});

test("table booking: missing fields, bad phone, bad date, bad email are rejected", async () => {
  const url = srv.base + "/api/bookings/create";
  assert.equal((await postJson(url, { name: "A", booking_mode: "table" })).status, 400);
  assert.equal((await postJson(url, { name: "A", phone: "12", booking_date: "2030-01-15", booking_time: "7:00 PM" })).status, 400);
  assert.equal((await postJson(url, { name: "A", phone: "9876543210", booking_date: "2030-02-31", booking_time: "7:00 PM" })).status, 400);
  assert.equal((await postJson(url, { name: "A", phone: "9876543210", email: "nope", booking_date: "2030-01-15", booking_time: "7:00 PM" })).status, 400);
  assert.equal((await postJson(url, { name: "A", phone: "9876543210", booking_mode: "rocket" })).status, 400);
});

test("takeaway booking needs items and pickup time", async () => {
  const url = srv.base + "/api/bookings/create";
  assert.equal((await postJson(url, { name: "A", phone: "9876543210", booking_mode: "takeaway" })).status, 400);
  const ok = await postJson(url, { name: "A", phone: "9876543210", booking_mode: "takeaway", items: "Chicken biryani x2", pickup_time: "ASAP" });
  assert.equal(ok.status, 200, JSON.stringify(ok.data));
});

test("catering inquiry validates and saves", async () => {
  const url = srv.base + "/api/catering/create";
  assert.equal((await postJson(url, { name: "A", phone: "9876543210" })).status, 400);
  assert.equal((await postJson(url, { name: "A", phone: "abc", event_type: "wedding" })).status, 400);
  const ok = await postJson(url, { name: "A", phone: "9876543210", event_type: "wedding", guest_count: 150, event_date: "2030-03-01" });
  assert.equal(ok.status, 200, JSON.stringify(ok.data));
});

test("admin APIs refuse requests without a valid token", async () => {
  assert.equal((await fetch(srv.base + "/api/bookings/list")).status, 401);
  assert.equal((await fetch(srv.base + "/api/bookings/list", { headers: { "x-staff-token": Buffer.from("staff:test-pass-123").toString("base64") } })).status, 401, "old base64 token format must no longer work");
  assert.equal((await fetch(srv.base + "/api/bookings/list", { headers: { "x-staff-token": "forged.token" } })).status, 401);
});

test("hero image can no longer be changed anonymously", async () => {
  const res = await fetch(srv.base + "/api/hero-image", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ hero_key: "uploads/x.jpg" }) });
  assert.equal(res.status, 401);
});

test("staff login: wrong password 401, right password gives a working token without the password in it", async () => {
  const bad = await postJson(srv.base + "/api/staff/login", { username: "staff", password: "wrong" });
  assert.equal(bad.status, 401);
  const good = await postJson(srv.base + "/api/staff/login", { username: "staff", password: "test-pass-123" });
  assert.equal(good.status, 200);
  const token = good.data.token;
  assert.ok(token && !Buffer.from(token.split(".")[0], "base64url").toString().includes("test-pass-123"));
  const list = await fetch(srv.base + "/api/bookings/list", { headers: { "x-staff-token": token } });
  assert.equal(list.status, 200);
  const body = await list.json();
  assert.ok(Array.isArray(body.bookings) && body.bookings.length >= 1);
  const check = await postJson(srv.base + "/api/staff/check", { token });
  assert.equal(check.status, 200);
  // hero reset (empty key) is accepted for staff — this used to fail with 400
  const reset = await fetch(srv.base + "/api/hero-image", { method: "PUT", headers: { "content-type": "application/json", "x-staff-token": token }, body: JSON.stringify({ hero_key: "" }) });
  assert.equal(reset.status, 200);
});

test("staff login is rate limited after repeated failures", async () => {
  const ip = { "x-forwarded-for": "203.0.113.9" };
  let last;
  for (let i = 0; i < 9; i++) last = await postJson(srv.base + "/api/staff/login", { username: "staff", password: "nope" + i }, ip);
  assert.equal(last.status, 429);
  // another visitor is not affected
  const other = await postJson(srv.base + "/api/staff/login", { username: "staff", password: "nope" }, { "x-forwarded-for": "198.51.100.7" });
  assert.equal(other.status, 401);
});
