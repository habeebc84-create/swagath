// Shared staff authentication for the admin API.
//
// Why this exists: every admin handler used to carry its own copy of a default
// password that is visible in this public repo, and the "token" was simply
// base64(user:password), so anyone holding a token could read the password
// back out of it. This module replaces that with:
//   - credentials from environment variables (STAFF_USER / STAFF_PASSWORD);
//   - in production (NODE_ENV=production) staff login is DISABLED until
//     STAFF_PASSWORD is set, so the old public default cannot be used live;
//   - signed, expiring tokens (HMAC-SHA256) that do not contain the password;
//   - constant-time comparisons and a small per-IP login rate limit.

import crypto from "node:crypto";

const DEV_DEFAULT_USER = "admin";
const DEV_DEFAULT_PASS = "Swagath@2026"; // local development only
const TOKEN_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

let warned = false;

function isProduction() {
  return process.env.NODE_ENV === "production";
}

/** Returns { user, pass } or null when staff login is not configured. */
export function staffCredentials() {
  const envPass = process.env.STAFF_PASSWORD;
  const user = (process.env.STAFF_USER || DEV_DEFAULT_USER).trim();
  if (envPass && envPass.length > 0) return { user, pass: envPass };
  if (isProduction()) return null;
  if (!warned) {
    warned = true;
    console.warn("[staff-auth] STAFF_PASSWORD is not set — using the local development default. Never deploy like this.");
  }
  return { user, pass: DEV_DEFAULT_PASS };
}

export function staffLoginConfigured() {
  return staffCredentials() !== null;
}

function signingKey(creds) {
  // A dedicated secret is best; otherwise derive one from the credentials so
  // changing the password invalidates every existing token.
  const secret = process.env.STAFF_SECRET || `${creds.user}\u0000${creds.pass}\u0000swagath-staff`;
  return crypto.createHash("sha256").update(secret).digest();
}

function safeEqual(a, b) {
  const ab = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ab.length !== bb.length) {
    crypto.timingSafeEqual(ab, ab); // keep timing similar
    return false;
  }
  return crypto.timingSafeEqual(ab, bb);
}

function b64url(buf) {
  return Buffer.from(buf).toString("base64url");
}

/** Checks a username/password pair. */
export function checkCredentials(username, password) {
  const creds = staffCredentials();
  if (!creds) return false;
  const userOk = safeEqual(String(username || "").trim(), creds.user);
  const passOk = safeEqual(String(password || ""), creds.pass);
  return userOk && passOk;
}

/** Issues a signed token: base64url(payload).base64url(hmac). */
export function issueToken(now = Date.now()) {
  const creds = staffCredentials();
  if (!creds) throw new Error("Staff login is not configured");
  const payload = b64url(JSON.stringify({ u: creds.user, exp: now + TOKEN_TTL_MS, n: crypto.randomBytes(8).toString("hex") }));
  const sig = b64url(crypto.createHmac("sha256", signingKey(creds)).update(payload).digest());
  return `${payload}.${sig}`;
}

/** Verifies a token string. */
export function verifyToken(token, now = Date.now()) {
  const creds = staffCredentials();
  if (!creds || typeof token !== "string" || token.length > 512) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [payload, sig] = parts;
  const expected = b64url(crypto.createHmac("sha256", signingKey(creds)).update(payload).digest());
  if (!safeEqual(sig, expected)) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return data && data.u === creds.user && typeof data.exp === "number" && data.exp > now;
  } catch {
    return false;
  }
}

/** Reads the staff token from the request (header first, then body). */
export function requestToken(req) {
  const h = (req && req.headers) || {};
  return String(h["x-staff-token"] || (req && req.body && req.body.token) || "");
}

/** True when the request carries a valid staff token. */
export function isStaff(req) {
  return verifyToken(requestToken(req));
}

/* ------------------------------ login rate limit ----------------------------- */

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILS = 8;
const fails = new Map(); // ip -> { count, first }

export function loginBlocked(ip, now = Date.now()) {
  const rec = fails.get(ip || "?");
  if (!rec) return false;
  if (now - rec.first > WINDOW_MS) {
    fails.delete(ip || "?");
    return false;
  }
  return rec.count >= MAX_FAILS;
}

export function recordLoginFailure(ip, now = Date.now()) {
  const key = ip || "?";
  const rec = fails.get(key);
  if (!rec || now - rec.first > WINDOW_MS) fails.set(key, { count: 1, first: now });
  else rec.count += 1;
  if (fails.size > 5000) fails.clear(); // memory guard
}

export function clearLoginFailures(ip) {
  fails.delete(ip || "?");
}

export const _limits = { WINDOW_MS, MAX_FAILS, TOKEN_TTL_MS };
