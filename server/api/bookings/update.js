import { db } from "hatchable";

export const access = "public";
export const methods = ["POST"];

const STAFF_USER = process.env.STAFF_USER || "admin";
const STAFF_PASS = process.env.STAFF_PASSWORD || "Swagath@2026";

function validToken(req) {
  const expected = Buffer.from(STAFF_USER + ":" + STAFF_PASS).toString("base64");
  const token = req.headers["x-staff-token"] || "";
  return token === expected;
}

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