export const access = "public";
export const methods = ["POST"];

// Default staff credentials (change via STAFF_USER / STAFF_PASSWORD env if set)
const STAFF_USER = process.env.STAFF_USER || "admin";
const STAFF_PASS = process.env.STAFF_PASSWORD || "Swagath@2026";

export default async function (req, res) {
  const body = req.body || {};
  const user = String(body.username || "").trim();
  const pass = String(body.password || "");

  if (user === STAFF_USER && pass === STAFF_PASS) {
    // Simple session token (password-derived, checked by admin APIs)
    const token = Buffer.from(STAFF_USER + ":" + STAFF_PASS).toString("base64");
    return res.json({
      success: true,
      token,
      message: "Logged in"
    });
  }

  res.status(401).json({ success: false, error: "Invalid ID or password" });
}