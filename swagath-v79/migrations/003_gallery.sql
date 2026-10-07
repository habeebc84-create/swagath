CREATE TABLE IF NOT EXISTS gallery_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url TEXT NOT NULL,
  caption TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_large BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO gallery_items (image_url, caption, sort_order, is_large) VALUES
  ('https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1000&q=85', 'Warm dining ambience', 1, true),
  ('https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=700&q=85', 'Signature flavours', 2, false),
  ('https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=700&q=85', 'Fresh preparations', 3, false),
  ('https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?auto=format&fit=crop&w=700&q=85', 'Chef specials', 4, false),
  ('https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=700&q=85', 'Events & catering', 5, false)
ON CONFLICT DO NOTHING;