import { db } from "hatchable";

export const access = "public";
export const methods = ["POST"];

export default async function (req, res) {
  const { name, phone, email, party_size, booking_date, booking_time, special_request } = req.body || {};

  if (!name || !phone || !booking_date || !booking_time) {
    return res.status(400).json({ error: "Name, phone, date and time are required" });
  }

  const size = Math.min(Math.max(parseInt(party_size) || 2, 1), 20);

  const { rows } = await db.query(
    `INSERT INTO bookings (name, phone, email, party_size, booking_date, booking_time, special_request)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, name, booking_date, booking_time, status`,
    [name.trim(), phone.trim(), email ? email.trim() : null, size, booking_date, booking_time, special_request || null]
  );

  res.json({ success: true, booking: rows[0] });
}