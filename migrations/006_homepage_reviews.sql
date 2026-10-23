CREATE TABLE IF NOT EXISTS homepage_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rating INTEGER NOT NULL DEFAULT 5,
  text TEXT NOT NULL,
  author TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 50,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO homepage_reviews (rating, text, author, sort_order) VALUES
  (5, 'Food is fantastic. Atmosphere is mind blowing.', 'Subhash Khatri', 10),
  (5, 'Best Rayalseema cuisine in Kalikiri. Real spicy.', 'ashraf bimal', 20),
  (5, 'Hyderabadi Dum Biryani so tasty. Staff good.', 'Santosh Kumar', 30),
  (4, 'Best Tandoori in recent times. Perfectly cooked.', 'Local Guide', 40)
ON CONFLICT DO NOTHING;
