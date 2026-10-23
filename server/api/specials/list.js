export const access = "public";
export const methods = ["GET"];

const DEFAULT_SPECIALS = [
  {
    id: "9a1b2c3d-4e5f-6a7b-8c9d-0e1f2a3b4c5d",
    title: "Tandoori Chicken",
    blurb: "Half or full — smoky, juicy, locals’ favourite.",
    price: "₹250 / ₹480",
    image_url: "https://images.unsplash.com/photo-1598103442097-8b74394b95c6?auto=format&fit=crop&w=800&q=85",
    image_fallback: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80"
  },
  {
    id: "9a1b2c3d-4e5f-6a7b-8c9d-0e1f2a3b4c5e",
    title: "Hyderabadi Dum Biryani",
    blurb: "Fragrant basmati, tender chicken, layered perfection.",
    price: "From ₹200",
    image_url: "https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=800&q=85",
    image_fallback: "https://images.unsplash.com/photo-1631515243349-e0cb75fb8d3a?auto=format&fit=crop&w=800&q=80"
  },
  {
    id: "9a1b2c3d-4e5f-6a7b-8c9d-0e1f2a3b4c5f",
    title: "Family Packs",
    blurb: "Dum pack ₹500 · Spl Chicken pack ₹600 — ideal for bulk.",
    price: "₹500 – ₹600",
    image_url: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=85",
    image_fallback: "https://images.unsplash.com/photo-1600891964092-4316c288032e?auto=format&fit=crop&w=800&q=80"
  }
];

export default async function (req, res) {
  try {
    const { db } = await import("hatchable");
    const { rows } = await db.query(
      `SELECT id, title, blurb, price, image_url, image_fallback, sort_order
       FROM homepage_specials ORDER BY sort_order ASC, created_at ASC LIMIT 20`
    );
    if (rows && rows.length) {
      return res.json({ specials: rows });
    }
  } catch {
    /* no specials table/rows yet — fall through to default seed */
  }
  res.json({ specials: DEFAULT_SPECIALS });
}
