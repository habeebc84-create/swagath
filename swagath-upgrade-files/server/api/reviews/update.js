import { isStaff } from "../../lib/staff-auth.js";
export const access = "public";
export const methods = ["POST"];


const validToken = isStaff;

export default async function (req, res) {
  if (!validToken(req)) return res.status(401).json({ error: "Unauthorized" });

  const { author, sort_order } = req.body || {};
  if (!author) return res.status(400).json({ error: "author required" });

  await (await import("hatchable")).db.query(
    `UPDATE homepage_reviews SET sort_order = $1 WHERE author = $2`,
    [Number(sort_order) || 50, String(author).trim()]
  );

  res.json({ success: true });
}
