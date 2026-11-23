// Small input helpers for the public forms (bookings, catering).
// Server-side checks so oversized or malformed submissions are rejected even
// if someone bypasses the browser form.

/** Trims a value to a string and caps its length; returns null when empty. */
export function text(value, max = 500) {
  if (value === null || value === undefined) return null;
  const s = String(value).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim();
  if (!s) return null;
  return s.slice(0, max);
}

/** Indian phone numbers: 10 digits, optional +91 / 0 prefix, spaces and dashes allowed. */
export function isValidPhone(value) {
  const digits = String(value || "").replace(/[\s\-()]/g, "");
  return /^(\+91|91|0)?[6-9]\d{9}$/.test(digits) || /^0\d{10}$/.test(digits);
}

export function isValidEmail(value) {
  if (!value) return true; // optional field
  return String(value).length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value));
}

/** YYYY-MM-DD, a real calendar date. */
export function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) return false;
  const d = new Date(value + "T00:00:00Z");
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}
