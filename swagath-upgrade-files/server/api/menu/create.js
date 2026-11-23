import { db } from "hatchable";
import { isStaff } from "../../lib/staff-auth.js";

export const access = "public";
export const methods = ["POST"];


const validToken = isStaff;

export default async function (req, res) {
  if (!validToken(req)) return res.status(401).json({ error: "Unauthorized" });
  const b = req.body || {};
  const name = String(b.name || "").trim();
  const price = String(b.price || "").trim();
  const category = String(b.category || "biryani").trim();
  if (!name || !price) return res.status(400).json({ error: "name and price required" });
  const { rows } = await db.query(
    `INSERT INTO menu_items (category, group_name, name, price, sort_order, is_active)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [category, String(b.group_name || ""), name, price, Number(b.sort_order) || 0, b.is_active !== false]
  );
  res.json({ success: true, item: rows[0] });
}