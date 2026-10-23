CREATE TABLE IF NOT EXISTS homepage_specials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  blurb TEXT NOT NULL DEFAULT '',
  price TEXT NOT NULL,
  image_url TEXT NOT NULL DEFAULT '',
  image_fallback TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 50,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO homepage_specials (id, title, blurb, price, image_url, image_fallback, sort_order) VALUES
  ('9a1b2c3d-4e5f-6a7b-8c9d-0e1f2a3b4c5d', 'Tandoori Chicken', 'Half or full — smoky, juicy, locals’ favourite.', '₹250 / ₹480',
    'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?auto=format&fit=crop&w=800&q=85',
    'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80', 10),
  ('9a1b2c3d-4e5f-6a7b-8c9d-0e1f2a3b4c5e', 'Hyderabadi Dum Biryani', 'Fragrant basmati, tender chicken, layered perfection.', 'From ₹200',
    'https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=800&q=85',
    'https://images.unsplash.com/photo-1631515243349-e0cb75fb8d3a?auto=format&fit=crop&w=800&q=80', 20),
  ('9a1b2c3d-4e5f-6a7b-8c9d-0e1f2a3b4c5f', 'Family Packs', 'Dum pack ₹500 · Spl Chicken pack ₹600 — ideal for bulk.', '₹500 – ₹600',
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=85',
    'https://images.unsplash.com/photo-1600891964092-4316c288032e?auto=format&fit=crop&w=800&q=80', 30)
ON CONFLICT DO NOTHING;
