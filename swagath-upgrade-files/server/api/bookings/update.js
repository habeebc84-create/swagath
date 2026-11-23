import { db } from "hatchable";
import { isStaff } from "../../lib/staff-auth.js";

export const access = "public";
export const methods = ["POST"];


const validToken = isStaff;

export default async function (req, res) {
  if (!validToken(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const { id, status } = req.body || {};
  if (!id || !status) {
    return res.status(400).json({ error: "id and status required" });
  }
  await db.query(`UPDATE bookings SET status = $1 WHERE id = $2`, [status, id]);
  res.json({ success: true });
}