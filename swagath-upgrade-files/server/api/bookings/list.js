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
    `SELECT id, name, phone, email, party_size,
       booking_date, booking_time, special_request,
       booking_mode, items, pickup_time,
       address, delivery_address, delivery_time,
       location_lat, location_lng, location_source, location_status,
       status, created_at
     FROM bookings
     ORDER BY booking_date DESC, booking_time DESC
     LIMIT 100`
  );
  res.json({ bookings: rows });
}
