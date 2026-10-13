import { db } from "hatchable";

export const access = "public";
export const methods = ["GET"];

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
  const { rows } = await db.query(
    `SELECT id, name, phone, email, party_size, booking_date, booking_time, special_request, status, created_at
     FROM bookings
     ORDER BY booking_date DESC, booking_time DESC
     LIMIT 100`
  );
  res.json({ bookings: rows });
}