import { db } from "hatchable";
import { text, isValidPhone, isValidEmail, isValidDate } from "../../lib/validate.js";

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

  if (!isValidPhone(phone)) {
    return res.status(400).json({ error: "Please enter a valid 10-digit phone number" });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: "Please enter a valid email address or leave it empty" });
  }
  if (event_date && !isValidDate(event_date)) {
    return res.status(400).json({ error: "Please choose a valid event date" });
  }

  const guests = Math.min(Math.max(parseInt(guest_count) || 20, 10), 2000);

  const { rows } = await db.query(
    `INSERT INTO catering_inquiries
      (name, phone, email, event_type, guest_count, event_date, event_location, package_interest, dietary_notes, message)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     RETURNING id, name, event_type, guest_count, status`,
    [
      text(name, 120),
      text(phone, 20),
      text(email, 254),
      text(event_type, 40),
      guests,
      event_date || null,
      text(event_location, 300),
      text(package_interest, 60),
      text(dietary_notes, 1000),
      text(message, 2000)
    ]
  );

  res.json({ success: true, inquiry: rows[0] });
}