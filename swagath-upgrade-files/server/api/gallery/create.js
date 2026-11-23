import { db } from "hatchable";
import { isStaff } from "../../lib/staff-auth.js";

export const access = "public";
export const methods = ["POST"];


const validToken = isStaff;

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