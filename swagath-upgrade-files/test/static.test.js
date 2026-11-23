import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { ROOT } from "./helpers.js";

const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");

test("index.html: one h1, main landmark, skip link, canonical", () => {
  const html = read("public/index.html");
  assert.equal((html.match(/<h1[\s>]/g) || []).length, 1);
  assert.match(html, /<main id="main"/);
  assert.match(html, /class="skip-link" href="#main"/);
  assert.match(html, /<link rel="canonical" href="https:\/\/swagath-one\.vercel\.app\/">/);
  assert.doesNotMatch(html, /swagath\.hatchable\.site/);
});

test("index.html: Restaurant structured data is valid JSON with the call number", () => {
  const html = read("public/index.html");
  const m = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert.ok(m);
  const data = JSON.parse(m[1]);
  assert.equal(data["@type"], "Restaurant");
  assert.equal(data.telephone, "+91-8340003444");
  assert.equal(data.url, "https://swagath-one.vercel.app/");
});

test("every WhatsApp link carries the India country code", () => {
  for (const f of ["public/index.html", "public/app.js"]) {
    const links = read(f).match(/wa\.me\/\d+/g) || [];
    for (const l of links) assert.match(l, /wa\.me\/91\d{10}$/, `${f}: ${l}`);
  }
});

test("images have alt text and have width/height or lazy loading", () => {
  const html = read("public/index.html");
  const imgs = html.match(/<img\b[^>]*>/g) || [];
  assert.ok(imgs.length > 5);
  for (const tag of imgs) assert.match(tag, /\balt=/, tag.slice(0, 80));
});

test("no default staff password left in the API handlers", () => {
  const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]);
  for (const f of walk(path.join(ROOT, "server", "api"))) {
    assert.doesNotMatch(fs.readFileSync(f, "utf8"), /Swagath@2026|process\.env\.STAFF_PASSWORD \|\|/, f);
  }
});

test("legal pages and 404 have main landmarks and canonical links", () => {
  for (const f of ["public/privacy.html", "public/terms.html", "public/404.html"]) assert.match(read(f), /<main id="main"/, f);
  assert.match(read("public/privacy.html"), /rel="canonical"/);
  assert.match(read("public/terms.html"), /rel="canonical"/);
});
