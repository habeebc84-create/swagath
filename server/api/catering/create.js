import { db } from "hatchable";

export const access = "public";
export const methods = ["POST"];

export default async function (req, res) {
  const {
    name, phone, email, event_type, guest_count,
    event_date, event_location, package_interest, dietary_notes, message
  } = req.body || {};

  if (!name || !phone || !event_type) {
    return res.status(400).json({ error: "Name, phone and event type are required" });
  }

  const guests = Math.min(Math.max(parseInt(guest_count) || 20, 10), 2000);

  const { rows } = await db.query(
    `INSERT INTO catering_inquiries
      (name, phone, email, event_type, guest_count, event_date, event_location, package_interest, dietary_notes, message)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     RETURNING id, name, event_type, guest_count, status`,
    [
      name.trim(),
      phone.trim(),
      email ? email.trim() : null,
      event_type,
      guests,
      event_date || null,
      event_location || null,
      package_interest || null,
      dietary_notes || null,
      message || null
    ]
  );

  res.json({ success: true, inquiry: rows[0] });
}