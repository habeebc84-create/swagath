import { db } from "hatchable";
import { isStaff } from "../../lib/staff-auth.js";

export const access = "public";
export const methods = ["GET"];


const validToken = isStaff;

export default async function (req, res) {
  if (!validToken(req)) return res.status(401).json({ error: "Unauthorized" });
  const { rows } = await db.query(
    `SELECT id, category, group_name, name, price, sort_order, is_active
     FROM menu_items
     ORDER BY category, sort_order ASC, name ASC`
  );
  res.json({ items: rows });
}