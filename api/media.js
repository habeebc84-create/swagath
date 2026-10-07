import { storage } from "hatchable";

export const access = "public";
export const methods = ["GET"];

export default async function (req, res) {
  const key = (req.query && req.query.key) || "";
  if (!key || key.includes("..") || !key.startsWith("uploads/")) {
    return res.status(400).json({ error: "Invalid key" });
  }
  try {
    const file = await storage.get(key);
    if (!file || !file.buffer) {
      return res.status(404).json({ error: "Not found" });
    }
    res.setHeader("Content-Type", file.contentType || "image/jpeg");
    res.setHeader("Cache-Control", "public, max-age=604800, immutable");
    res.send(file.buffer);
  } catch (e) {
    res.status(404).json({ error: "Not found" });
  }
}