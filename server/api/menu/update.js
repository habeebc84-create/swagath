import { db } from "hatchable";

export const access = "public";
export const methods = ["POST"];

const STAFF_USER = process.env.STAFF_USER || "admin";
const STAFF_PASS = process.env.STAFF_PASSWORD || "Swagath@2026";

function validToken(req) {
  const expected = Buffer.from(STAFF_USER + ":" + STAFF_PASS).toString("base64");
  return (req.headers["x-staff-token"] || "") === expected;
}

export default async function (req, res) {
  if (!validToken(req)) return res.status(401).json({ error: "Unauthorized" });
  const b = req.body || {};
  if (!b.id) return res.status(400).json({ error: "id required" });
  if (b.name !== undefined) await db.query(`UPDATE menu_items SET name = $1 WHERE id = $2`, [String(b.name).trim(), b.id]);
  if (b.price !== undefined) await db.query(`UPDATE menu_items SET price = $1 WHERE id = $2`, [String(b.price).trim(), b.id]);
  if (b.category !== undefined) await db.query(`UPDATE menu_items SET category = $1 WHERE id = $2`, [String(b.category).trim(), b.id]);
  if (b.group_name !== undefined) await db.query(`UPDATE menu_items SET group_name = $1 WHERE id = $2`, [String(b.group_name), b.id]);
  if (b.sort_order !== undefined) await db.query(`UPDATE menu_items SET sort_order = $1 WHERE id = $2`, [Number(b.sort_order) || 0, b.id]);
  if (b.is_active !== undefined) await db.query(`UPDATE menu_items SET is_active = $1 WHERE id = $2`, [!!b.is_active, b.id]);
  res.json({ success: true });
}