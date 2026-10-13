import { storage } from "hatchable";

export const access = "public";
export const methods = ["GET"];

const CONFIG_KEY = "branding.json";

export async function readBranding() {
  try {
    const file = await storage.get(CONFIG_KEY);
    if (file && file.buffer) {
      const cfg = JSON.parse(file.buffer.toString("utf8"));
      if (cfg && typeof cfg.logo === "string" && cfg.logo) return cfg;
    }
  } catch {
    /* no branding stored yet */
  }
  return { logo: null };
}

export default async function (req, res) {
  const cfg = await readBranding();
  const logo = cfg.logo || null;
  res.json({
    logo,
    url: logo ? `/api/media?key=${encodeURIComponent(logo)}` : null,
    updated_at: cfg.updated_at || null
  });
}
