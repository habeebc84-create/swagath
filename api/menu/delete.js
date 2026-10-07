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
  const { id } = req.body || {};
  if (!id) return res.status(400).json({ error: "id required" });
  await db.query(`DELETE FROM menu_items WHERE id = $1`, [id]);
  res.json({ success: true });
}