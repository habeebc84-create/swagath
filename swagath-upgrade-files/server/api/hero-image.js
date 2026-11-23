import { storage } from "hatchable";
import { isStaff } from "../lib/staff-auth.js";

export const access = "public";
export const methods = ["GET", "PUT"];

function readConfig() {
  return storage
    .get("branding.json")
    .then((file) => {
      if (!file || !file.buffer) return {};
      try {
        return JSON.parse(file.buffer.toString("utf8"));
      } catch {
        return {};
      }
    })
    .catch(() => ({}));
}

function writeConfig(cfg) {
  return storage.put(
    "branding.json",
    JSON.stringify(cfg),
    "application/json"
  );
}

export default async function (req, res) {
  const body = req.body || {};

  if (req.method === "GET") {
    const cfg = await readConfig();
    return res.json({
      success: true,
      hero_key: cfg.hero || null,
      hero_url: cfg.hero
        ? `/api/media?key=${encodeURIComponent(cfg.hero)}`
        : null,
    });
  }

  if (req.method === "PUT") {
    // Changing the hero is a staff action (it used to be open to anyone).
    if (!isStaff(req)) return res.status(401).json({ error: "Unauthorized" });
    const hero_key = body && body.hero_key != null ? String(body.hero_key) : "";
    const cfg = await readConfig();
    // Empty key = restore the default hero (the admin "Reset" button sends "").
    if (hero_key === "") {
      cfg.hero = null;
      await writeConfig(cfg);
      return res.json({ success: true, hero_key: null, hero_url: null });
    }
    if (!hero_key.startsWith("uploads/") || hero_key.includes("..")) {
      return res
        .status(400)
        .json({ error: "hero_key must start with uploads/" });
    }
    cfg.hero = hero_key;
    await writeConfig(cfg);
    return res.json({
      success: true,
      hero_key,
      hero_url: `/api/media?key=${encodeURIComponent(hero_key)}`,
    });
  }

  res.status(405).json({ error: "Method not allowed" });
}
