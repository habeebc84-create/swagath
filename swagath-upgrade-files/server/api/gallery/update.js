import { db } from "hatchable";
import { isStaff } from "../../lib/staff-auth.js";

export const access = "public";
export const methods = ["POST"];


const validToken = isStaff;

export default async function (req, res) {
  if (!validToken(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const { id, caption, sort_order, is_large, image_url } = req.body || {};
  if (!id) return res.status(400).json({ error: "id required" });
  if (caption !== undefined) await db.query(`UPDATE gallery_items SET caption = $1 WHERE id = $2`, [caption, id]);
  if (sort_order !== undefined) await db.query(`UPDATE gallery_items SET sort_order = $1 WHERE id = $2`, [sort_order, id]);
  if (is_large !== undefined) await db.query(`UPDATE gallery_items SET is_large = $1 WHERE id = $2`, [!!is_large, id]);
  if (image_url !== undefined) await db.query(`UPDATE gallery_items SET image_url = $1 WHERE id = $2`, [image_url, id]);
  res.json({ success: true });
}