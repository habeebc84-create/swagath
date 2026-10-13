import { db } from "hatchable";

export const access = "public";
export const methods = ["GET"];

export default async function (req, res) {
  try {
    const { rows } = await db.query(
      `SELECT id, category, group_name, name, price, sort_order, is_active
       FROM menu_items
       WHERE is_active = true
       ORDER BY category, sort_order ASC, name ASC`
    );
    res.json({ items: rows });
  } catch (e) {
    res.json({ items: [] });
  }
}