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

  const { title, blurb, price, image_url, image_fallback, id } = req.body || {};
  if (!title) return res.status(400).json({ error: "title required" });
  if (!price) return res.status(400).json({ error: "price required" });

  try {
    const { db } = await import("hatchable");
    let { rows } = await db.query(
      `SELECT id FROM homepage_specials WHERE id = $1 LIMIT 1`,
      [id]
    );
    if (!rows || !rows.length) {
      const { rows: inserted } = await db.query(
        `INSERT INTO homepage_specials (title, blurb, price, image_url, image_fallback, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [
          String(title).trim(),
          String(blurb || "").trim(),
          String(price).trim(),
          String(image_url || "").trim(),
          String(image_fallback || "").trim(),
          Number(50)
        ]
      );
      return res.json({ success: true, special: inserted[0] });
    }
    await db.query(
      `UPDATE homepage_specials
       SET title = $1, blurb = $2, price = $3, image_url = $4, image_fallback = $5
       WHERE id = $6`,
      [
        String(title).trim(),
        String(blurb || "").trim(),
        String(price).trim(),
        String(image_url || "").trim(),
        String(image_fallback || "").trim(),
        id
      ]
    );
    const { rows: updated } = await db.query(
      `SELECT * FROM homepage_specials WHERE id = $1`,
      [id]
    );
    return res.json({ success: true, special: updated[0] });
  } catch {
    const { db } = await import("hatchable");
    const { rows: inserted } = await db.query(
      `INSERT INTO homepage_specials (title, blurb, price, image_url, image_fallback, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        String(title).trim(),
        String(blurb || "").trim(),
        String(price).trim(),
        String(image_url || "").trim(),
        String(image_fallback || "").trim(),
        Number(50)
      ]
    );
    return res.json({ success: true, special: inserted[0] });
  }
}
