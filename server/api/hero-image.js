import { storage } from "hatchable";

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
    const { hero_key } = body || {};
    if (!hero_key) {
      return res.status(400).json({ error: "hero_key required" });
    }
    if (!String(hero_key).startsWith("uploads/")) {
      return res
        .status(400)
        .json({ error: "hero_key must start with uploads/" });
    }
    const cfg = await readConfig();
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
