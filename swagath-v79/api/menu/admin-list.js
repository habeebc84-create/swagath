import { db } from "hatchable";

export const access = "public";
export const methods = ["GET"];

const STAFF_USER = process.env.STAFF_USER || "admin";
const STAFF_PASS = process.env.STAFF_PASSWORD || "Swagath@2026";

function validToken(req) {
  const expected = Buffer.from(STAFF_USER + ":" + STAFF_PASS).toString("base64");
  return (req.headers["x-staff-token"] || "") === expected;
}

export default async function (req, res) {
  if (!validToken(req)) return res.status(401).json({ error: "Unauthorized" });
  const { rows } = await db.query(
    `SELECT id, category, group_name, name, price, sort_order, is_active
     FROM menu_items
     ORDER BY category, sort_order ASC, name ASC`
  );
  res.json({ items: rows });
}