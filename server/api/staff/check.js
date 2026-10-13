export const access = "public";
export const methods = ["POST"];

const STAFF_USER = process.env.STAFF_USER || "admin";
const STAFF_PASS = process.env.STAFF_PASSWORD || "Swagath@2026";

export default async function (req, res) {
  const token = String((req.body && req.body.token) || req.headers["x-staff-token"] || "");
  const expected = Buffer.from(STAFF_USER + ":" + STAFF_PASS).toString("base64");
  if (token && token === expected) {
    return res.json({ ok: true });
  }
  res.status(401).json({ ok: false });
}