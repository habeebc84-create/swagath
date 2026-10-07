import { db } from "hatchable";

export const access = "public";
export const methods = ["POST"];

const STAFF_USER = process.env.STAFF_USER || "admin";
const STAFF_PASS = process.env.STAFF_PASSWORD || "Swagath@2026";

function validToken(req) {
  const expected = Buffer.from(STAFF_USER + ":" + STAFF_PASS).toString("base64");
  const token = req.headers["x-staff-token"] || "";
  return token === expected;
}

export default async function (req, res) {
  if (!validToken(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const { image_url, caption, sort_order, is_large } = req.body || {};
  if (!image_url) return res.status(400).json({ error: "image_url required" });
  const { rows } = await db.query(
    `INSERT INTO gallery_items (image_url, caption, sort_order, is_large) VALUES ($1, $2, $3, $4) RETURNING *`,
    [image_url, caption || "", sort_order || 0, !!is_large]
  );
  res.json({ success: true, item: rows[0] });
}