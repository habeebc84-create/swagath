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

  const { rating, text, author, id } = req.body || {};
  if (!rating && rating !== 0) return res.status(400).json({ error: "rating required" });
  if (!text) return res.status(400).json({ error: "text required" });
  if (!author) return res.status(400).json({ error: "author required" });

  try {
    const { db } = await import("hatchable");
    let { rows } = await db.query(
      `SELECT id FROM homepage_reviews WHERE author = $1 LIMIT 1`,
      [String(author).trim()]
    );
    if (!rows || !rows.length) {
      const { rows: inserted } = await db.query(
        `INSERT INTO homepage_reviews (rating, text, author, sort_order) VALUES ($1, $2, $3, $4) RETURNING *`,
        [Number(rating) || 5, String(text).trim(), String(author).trim(), 50]
      );
      return res.json({ success: true, review: inserted[0] });
    }
    await db.query(
      `UPDATE homepage_reviews SET rating = $1, text = $2 WHERE author = $3`,
      [Number(rating) || 5, String(text).trim(), String(author).trim()]
    );
    const { rows: updated } = await db.query(
      `SELECT * FROM homepage_reviews WHERE author = $1`,
      [String(author).trim()]
    );
    return res.json({ success: true, review: updated[0] });
  } catch {
    const { db } = await import("hatchable");
    const { rows: inserted } = await db.query(
      `INSERT INTO homepage_reviews (rating, text, author, sort_order) VALUES ($1, $2, $3, $4) RETURNING *`,
      [Number(rating) || 5, String(text).trim(), String(author).trim(), 50]
    );
    return res.json({ success: true, review: inserted[0] });
  }
}
