import {
  checkCredentials, issueToken, staffLoginConfigured,
  loginBlocked, recordLoginFailure, clearLoginFailures
} from "../../lib/staff-auth.js";

export const access = "public";
export const methods = ["POST"];

// Staff credentials come from STAFF_USER / STAFF_PASSWORD (see .env.example).
// In production, login stays disabled until STAFF_PASSWORD is set.
export default async function (req, res) {
  if (!staffLoginConfigured()) {
    return res.status(503).json({ success: false, error: "Staff login is not configured on this server yet (STAFF_PASSWORD missing)." });
  }
  const ip = req.ip || "";
  if (loginBlocked(ip)) {
    res.setHeader("Retry-After", "900");
    return res.status(429).json({ success: false, error: "Too many failed attempts. Try again in 15 minutes." });
  }

  const body = req.body || {};
  if (checkCredentials(body.username, body.password)) {
    clearLoginFailures(ip);
    return res.json({ success: true, token: issueToken(), message: "Logged in" });
  }

  recordLoginFailure(ip);
  res.status(401).json({ success: false, error: "Invalid ID or password" });
}
