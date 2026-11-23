import { isStaff } from "../../lib/staff-auth.js";
export const access = "public";
export const methods = ["POST"];


const validToken = isStaff;

export default async function (req, res) {
  if (!validToken(req)) return res.status(401).json({ error: "Unauthorized" });

  const { id, sort_order } = req.body || {};
  if (!id) return res.status(400).json({ error: "id required" });

  await (await import("hatchable")).db.query(
    `UPDATE homepage_specials SET sort_order = $1 WHERE id = $2`,
    [Number(sort_order) || 50, id]
  );

  res.json({ success: true });
}
