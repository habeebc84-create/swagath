import { test } from "node:test";
import assert from "node:assert/strict";
import { startServer, postJson } from "./helpers.js";

test("production without STAFF_PASSWORD: staff login is disabled and the old default does not work", async () => {
  const srv = await startServer({ NODE_ENV: "production", STAFF_PASSWORD: undefined, STAFF_USER: undefined });
  try {
    const r = await postJson(srv.base + "/api/staff/login", { username: "admin", password: "Swagath@2026" });
    assert.equal(r.status, 503);
    const res = await fetch(srv.base + "/");
    assert.match(res.headers.get("strict-transport-security") || "", /max-age=/);
    assert.match(res.headers.get("content-security-policy"), /upgrade-insecure-requests/);
  } finally {
    await srv.stop();
  }
});

test("production with STAFF_PASSWORD: login works", async () => {
  const srv = await startServer({ NODE_ENV: "production", STAFF_USER: "owner", STAFF_PASSWORD: "a-long-test-password" });
  try {
    const r = await postJson(srv.base + "/api/staff/login", { username: "owner", password: "a-long-test-password" });
    assert.equal(r.status, 200);
    assert.ok(r.data.token);
  } finally {
    await srv.stop();
  }
});
