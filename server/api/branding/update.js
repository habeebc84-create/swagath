import { storage } from "hatchable";
import { readBranding } from "./get.js";

export const access = "public";
export const methods = ["POST"];

const STAFF_USER = process.env.STAFF_USER || "admin";
const STAFF_PASS = process.env.STAFF_PASSWORD || "Swagath@2026";

const CONFIG_KEY = "branding.json";

function validToken(req) {
  const expected = Buffer.from(STAFF_USER + ":" + STAFF_PASS).toString("base64");
  return (req.headers["x-staff-token"] || "") === expected;
}

export default async function (req, res) {
  if (!validToken(req)) return res.status(401).json({ error: "Unauthorized" });

  const body = req.body || {};

  // Reset — clear the custom logo, the built-in emblem is served again.
  if (body.logo_key === "" || body.logo_key === null || body.reset === true) {
    await storage.put(CONFIG_KEY, Buffer.from(JSON.stringify({ logo: null, updated_at: new Date().toISOString() })), "application/json");
    return res.json({ success: true, logo: null, url: null });
  }

  const key = String(body.logo_key || "");
  if (!key.startsWith("uploads/") || key.includes("..")) {
    return res.status(400).json({ error: "Invalid logo key — upload the image first" });
  }

  const file = await storage.get(key);
  if (!file || !file.buffer || !file.buffer.length) {
    return res.status(400).json({ error: "Uploaded image not found — upload it again" });
  }
  if (!String(file.contentType || "").startsWith("image/")) {
    return res.status(400).json({ error: "Logo must be an image file (jpg, png, webp)" });
  }

  await storage.put(
    CONFIG_KEY,
    Buffer.from(JSON.stringify({ logo: key, updated_at: new Date().toISOString() })),
    "application/json"
  );

  const cfg = await readBranding();
  res.json({ success: true, logo: cfg.logo, url: `/api/media?key=${encodeURIComponent(cfg.logo)}` });
}
