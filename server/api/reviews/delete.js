export const access = "public";
export const methods = ["POST"];

const STAFF_USER = process.env.STAFF_USER || "admin";
const STAFF_PASS = process.env.STAFF_PASSWORD || "Swagath@2026";

function validToken(req) {
  const expected = Buffer.from(STAFF_USER + ":" + STAFF_PASS).toString("base64");
  return (req.headers["x-staff-token"] || "") === expected;
}

export default async function (req, res) {
  if (!validToken(req)) return res.status(401).json({ error: "Unauthorized" });

  const { author } = req.body || {};
  if (!author) return res.status(400).json({ error: "author required" });

  await (await import("hatchable")).db.query(
    `DELETE FROM homepage_reviews WHERE author = $1`,
    [String(author).trim()]
  );

  res.json({ success: true });
}
