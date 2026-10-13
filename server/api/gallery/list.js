import { db } from "hatchable";

export const access = "public";
export const methods = ["GET"];

export default async function (req, res) {
  try {
    const { rows } = await db.query(
      `SELECT id, image_url, caption, sort_order, is_large FROM gallery_items ORDER BY sort_order ASC, created_at ASC LIMIT 50`
    );
    res.json({ items: rows });
  } catch (e) {
    res.json({ items: [] });
  }
}