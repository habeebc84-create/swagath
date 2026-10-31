import { db } from "hatchable";

export const access = "public";
export const methods = ["POST"];

export default async function (req, res) {
  const {
    name, phone, email, party_size,
    booking_date, booking_time, special_request,
    booking_mode, items, pickup_time,
    address, delivery_address, delivery_time,
    location_lat, location_lng, location_source, location_status
  } = req.body || {};

  const mode = booking_mode || "table";

  let effectiveBookingDate = booking_date || null;
  let effectiveBookingTime = booking_time || null;
  let effectivePartySize = party_size;

  if (mode === "table") {
    if (!name || !phone || !booking_date || !booking_time) {
      return res.status(400).json({ error: "Name, phone, date and time are required" });
    }
  } else if (mode === "takeaway") {
    if (!name || !phone || !items || !pickup_time) {
      return res.status(400).json({ error: "Name, phone, items and pickup time are required for takeaway" });
    }
    effectiveBookingDate = null;
    effectiveBookingTime = null;
    effectivePartySize = null;
  } else if (mode === "delivery") {
    if (!name || !phone || !address || !delivery_address || !delivery_time) {
      return res.status(400).json({ error: "Name, phone, address and delivery time are required for delivery" });
    }
    effectiveBookingDate = null;
    effectiveBookingTime = null;
    effectivePartySize = null;
  }

  if (mode !== "table" && mode !== "takeaway" && mode !== "delivery") {
    return res.status(400).json({ error: "Unsupported booking mode" });
  }

  const size = mode === "table"
    ? Math.min(Math.max(parseInt(effectivePartySize) || 2, 1), 20)
    : null;

  // Persist the validated or captured location alongside the booking so the
  // kitchen / delivery team can see where to send the order.
  const locationAddress = (mode === "delivery" || mode === "takeaway") && address
    ? address.trim()
    : null;
  const locationLat = location_lat != null ? Number(location_lat) : null;
  const locationLng = location_lng != null ? Number(location_lng) : null;
  const locationSource = location_source || (locationAddress ? "manual" : null);
  const locationStatus = location_status || (locationLat != null && locationLng != null
    ? (locationStatusFromCoords(locationLat, locationLng) || "pending")
    : (locationAddress ? "accepted" : "pending"));

  function locationStatusFromCoords(lat, lng) {
    if (!isFinite(lat) || !isFinite(lng)) return null;
    const KALIKIRI_LAT = 13.7779;
    const KALIKIRI_LNG = 78.3870;
    const DRIFT_KM = 5.0;
    const dLat = (lat - KALIKIRI_LAT);
    const dLng = (lng - KALIKIRI_LNG);
    if (Math.abs(dLat) > 0.05 || Math.abs(dLng) > 0.05) return "outside";
    const R = 6371.008;
    const toRad = (deg) => deg * Math.PI / 180;
    const a = Math.sin(toRad(dLat) / 2) ** 2
      + Math.cos(toRad(KALIKIRI_LAT)) * Math.cos(toRad(lat))
      * Math.sin(toRad(dLng) / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (R * c) <= DRIFT_KM ? "accepted" : "outside";
  }
  const { rows } = await db.query(
    `INSERT INTO bookings (
       name, phone, email, party_size,
       booking_date, booking_time, special_request,
       booking_mode, items, pickup_time,
       address, delivery_address, delivery_time,
       location_lat, location_lng, location_source, location_status
     ) VALUES (
       $1, $2, $3, $4, $5, $6, $7,
       $8, $9, $10, $11, $12, $13,
       $14, $15, $16, $17
     )
     RETURNING id, name, email, party_size,
       booking_date, booking_time, special_request,
       booking_mode, items, pickup_time,
       address, delivery_address, delivery_time,
       location_lat, location_lng, location_source, location_status,
       status, created_at`,
    [
      name.trim(), phone.trim(), email ? email.trim() : null, size,
      effectiveBookingDate, effectiveBookingTime, special_request || null,
      mode, items || null, pickup_time || null,
      address || null, delivery_address || null, delivery_time || null,
      locationLat, locationLng, locationSource, locationStatus
    ]
  );

  res.json({ success: true, booking: rows[0] });
}
