export const access = "public";
export const methods = ["GET"];

const DEFAULT_REVIEWS = [
  { id: "1", rating: 5, text: "Food is fantastic. Atmosphere is mind blowing.", author: "Subhash Khatri" },
  { id: "2", rating: 5, text: "Best Rayalseema cuisine in Kalikiri. Real spicy.", author: "ashraf bimal" },
  { id: "3", rating: 5, text: "Hyderabadi Dum Biryani so tasty. Staff good.", author: "Santosh Kumar" },
  { id: "4", rating: 4, text: "Best Tandoori in recent times. Perfectly cooked.", author: "Local Guide" }
];

export default async function (req, res) {
  try {
    const { db } = await import("hatchable");
    const { rows } = await db.query(
      `SELECT id, rating, text, author, sort_order FROM homepage_reviews ORDER BY sort_order ASC, created_at ASC LIMIT 50`
    );
    if (rows && rows.length) {
      return res.json({ reviews: rows });
    }
  } catch {
    /* no reviews table/rows yet — fall through to default seed */
  }
  res.json({ reviews: DEFAULT_REVIEWS });
}
