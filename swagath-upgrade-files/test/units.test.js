import { test } from "node:test";
import assert from "node:assert/strict";
import { text, isValidPhone, isValidEmail, isValidDate } from "../server/lib/validate.js";
import { issueToken, verifyToken, _limits } from "../server/lib/staff-auth.js";

test("phone validation accepts Indian formats", () => {
  for (const ok of ["9876543210", "+91 98765 43210", "083400 03444", "08340003444", "91-9876543210"]) assert.ok(isValidPhone(ok), ok);
  for (const bad of ["", "12345", "abcdefghij", "1234567890", "+1 555 123 4567"]) assert.ok(!isValidPhone(bad), bad);
});

test("email and date validation", () => {
  assert.ok(isValidEmail(""));
  assert.ok(isValidEmail("a@b.in"));
  assert.ok(!isValidEmail("a@b"));
  assert.ok(isValidDate("2030-12-31"));
  assert.ok(!isValidDate("2030-02-30"));
  assert.ok(!isValidDate("31-12-2030"));
});

test("text() trims, caps and strips control characters", () => {
  assert.equal(text("  hi  "), "hi");
  assert.equal(text(""), null);
  assert.equal(text(null), null);
  assert.equal(text("a\u0000b"), "ab");
  assert.equal(text("x".repeat(50), 10).length, 10);
});

test("tokens verify, expire and resist tampering", () => {
  process.env.STAFF_PASSWORD = "unit-pass";
  process.env.STAFF_USER = "unit";
  const now = Date.now();
  const t = issueToken(now);
  assert.ok(verifyToken(t, now + 1000));
  assert.ok(!verifyToken(t, now + _limits.TOKEN_TTL_MS + 1), "expired");
  const [p, s] = t.split(".");
  assert.ok(!verifyToken(p + "x." + s, now));
  process.env.STAFF_PASSWORD = "changed";
  assert.ok(!verifyToken(t, now + 1000), "changing the password invalidates tokens");
});
