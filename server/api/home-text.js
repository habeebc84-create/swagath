export const access = "public";
export const methods = ["GET"];

export default async function (req, res) {
  res.json({
    subtitle: "Dining · Catering · Bulk orders — Rayalaseema heat, tandoori & dum biryani in Kalikiri",
    price: "₹200–400",
    seating: "A/C",
    cateringPax: "10–500+",
    location: "Kalikiri",
    meta: "Cross Road, AP"
  });
}
