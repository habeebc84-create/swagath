import { isStaff } from "../../lib/staff-auth.js";
export const access = "public";
export const methods = ["POST"];


const validToken = isStaff;

export default async function (req, res) {
  if (!validToken(req)) return res.status(401).json({ error: "Unauthorized" });

  const { author } = req.body || {};
  if (!author) return res.status(400).json({ error: "author required" });

  await (await import("hatchable")).db.query(
    `DELETE FROM homepage_reviews WHERE author = $1`,
    [String(author).trim()]
  );

  res.json({ success: true });
}
