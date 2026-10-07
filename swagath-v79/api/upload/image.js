import { storage } from "hatchable";

export const access = "public";
export const methods = ["POST"];

const STAFF_USER = process.env.STAFF_USER || "admin";
const STAFF_PASS = process.env.STAFF_PASSWORD || "Swagath@2026";
const MAX_BYTES = 4 * 1024 * 1024;

function validToken(req) {
  const expected = Buffer.from(STAFF_USER + ":" + STAFF_PASS).toString("base64");
  return (req.headers["x-staff-token"] || "") === expected;
}

export default async function (req, res) {
  if (!validToken(req)) return res.status(401).json({ error: "Unauthorized" });

  try {
    let buffer = null;
    let contentType = "image/jpeg";
    let filename = "photo";

    if (req.files && req.files.length) {
      const f = req.files[0];
      buffer = Buffer.from(f.buffer);
      contentType = f.contentType || contentType;
      filename = f.filename || filename;
    } else {
      const body = req.body || {};
      let data = body.data || body.image || "";
      if (!data) return res.status(400).json({ error: "No image data" });

      const match = String(data).match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
      if (match) {
        contentType = match[1];
        data = match[2];
      } else if (body.contentType) {
        contentType = body.contentType;
      }
      if (body.filename) filename = body.filename;

      buffer = Buffer.from(String(data).replace(/\s/g, ""), "base64");
    }

    if (!buffer || !buffer.length) {
      return res.status(400).json({ error: "Empty image" });
    }
    if (buffer.length > MAX_BYTES) {
      return res.status(400).json({ error: "Image too large (max 4 MB). Compress and try again." });
    }
    if (!String(contentType).startsWith("image/")) {
      return res.status(400).json({ error: "Only image files allowed (jpg, png, webp)" });
    }

    let ext = (contentType.split("/")[1] || "jpg").toLowerCase();
    if (ext === "jpeg") ext = "jpg";
    if (ext === "svg+xml") ext = "svg";

    // strip existing extension from filename to avoid photo.png.png
    let base = String(filename).replace(/\.[a-zA-Z0-9]+$/, "");
    base = base.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 40) || "img";
    const key = `uploads/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${base}.${ext}`;

    await storage.put(key, buffer, contentType);
    const url = `/api/media?key=${encodeURIComponent(key)}`;

    res.json({ success: true, url, key, contentType, size: buffer.length });
  } catch (e) {
    res.status(500).json({ error: e.message || "Upload failed" });
  }
}