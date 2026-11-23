import { db } from "hatchable";
import { isStaff } from "../../lib/staff-auth.js";

export const access = "public";
export const methods = ["GET"];


const validToken = isStaff;

export default async function (req, res) {
  if (!validToken(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const { rows } = await db.query(
    `SELECT * FROM catering_inquiries ORDER BY created_at DESC LIMIT 100`
  );
  res.json({ inquiries: rows });
}