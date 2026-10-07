CREATE TABLE IF NOT EXISTS menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  group_name TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL,
  price TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_menu_items_cat ON menu_items (category, sort_order);

-- Seed core menu (idempotent-ish: only if empty)
INSERT INTO menu_items (category, group_name, name, price, sort_order)
SELECT * FROM (VALUES
  ('soups', '', 'Tomato Soup', '₹80', 10),
  ('soups', '', 'Veg Hot and Sour Soup', '₹90', 20),
  ('soups', '', 'Veg Manchow Soup', '₹100', 30),
  ('soups', '', 'Lemon Coriander Soup', '₹120', 40),
  ('soups', '', 'Creamy Veg Soup (Spl)', '₹120 / ₹130', 50),
  ('soups', '', 'Chicken Hot & Sour Soup', '₹120 / ₹130', 60),
  ('soups', '', 'Chicken Manchow Soup', '₹120 / ₹130', 70),
  ('soups', '', 'Chicken Coriander Soup', '₹130', 80),
  ('soups', '', 'Creamy Non Veg Soup', '₹130', 90),
  ('soups', '', 'Thai Soup / Seafood Soup', '₹140', 100),
  ('veg-starters', 'Gobi', 'Gobi Manchurian / 65 / Chilli', '₹140', 10),
  ('veg-starters', 'Gobi', 'Gobi Honey Chilli / Pepper Gobi', '₹150', 20),
  ('veg-starters', 'Mushroom · Paneer · Babycorn', 'Mushroom 65 / Manchurian / Chilli', '₹210', 30),
  ('veg-starters', 'Mushroom · Paneer · Babycorn', 'Mushroom Pepper Salt / South Mushroom Spl', '₹220–230', 40),
  ('veg-starters', 'Mushroom · Paneer · Babycorn', 'Paneer 65 / Manchurian / Chilli / Pepper', '₹210', 50),
  ('veg-starters', 'Mushroom · Paneer · Babycorn', 'Paneer Majestic', '₹220', 60),
  ('veg-starters', 'Mushroom · Paneer · Babycorn', 'Babycorn 65 / Manchurian / Chilli / Crispy', '₹210–220', 70),
  ('veg-starters', 'Swagath Special Veg', 'Veg Spring Roll', '₹80', 80),
  ('veg-starters', 'Swagath Special Veg', 'Paneer / Mushroom Spring Roll', '₹110', 90),
  ('veg-starters', 'Swagath Special Veg', 'Stuffed Mushroom · Paneer Sizzler / Shahi / Stick', '₹200–230', 100),
  ('veg-starters', 'Swagath Special Veg', 'Thread Paneer', '₹250', 110),
  ('nonveg-starters', '', 'Chicken Fry / Roast (Andhra Style)', '₹190', 10),
  ('nonveg-starters', '', 'Chicken Kabab / 65 (Boneless)', '₹200–210', 20),
  ('nonveg-starters', '', 'Swagath Spl / Arabian Drumsticks / Kung Pao', '₹280', 30),
  ('nonveg-starters', '', 'Fish / Prawns starters', '₹250–280', 40),
  ('nonveg-starters', '', 'Mutton Fry / Chilli / 65 / Sukka', '₹300', 50),
  ('nonveg-starters', '', 'South Mutton Ghee Roast', '₹330', 60),
  ('rice', '', 'South Indian Meals / Parcel', '₹60', 10),
  ('rice', '', 'Veg Fried / Gobi / Jeera / Ghee Rice', '₹60', 20),
  ('rice', '', 'Spl Jeera Kaju / Veg Pulao / Veg Biryani', '₹90–100', 30),
  ('rice', '', 'Kaju / Mushroom Rice', '₹100', 40),
  ('biryani', '', 'Biryani Rice', '₹120', 10),
  ('biryani', '', 'Egg Biryani', '₹150', 20),
  ('biryani', '', 'Spl Egg Biryani', '₹170', 30),
  ('biryani', '', 'Hyderabadi Chicken Dum Biryani', '₹200', 40),
  ('biryani', '', 'Kabab / Frypiece / Leg Pieces Biryani', '₹220', 50),
  ('biryani', '', 'Swagath Spl / Mughlai / Lollipop / Gongura', '₹240', 60),
  ('biryani', '', 'Kaju / Fish Biryani', '₹250', 70),
  ('biryani', '', 'Prawns / Kalmi / Tikka / Barbeque Biryani', '₹260', 80),
  ('biryani', '', 'Mutton Biryani (Frypiece)', '₹280', 90),
  ('biryani', '', 'Mutton Kheema Biryani', '₹290', 100),
  ('biryani', '', 'Dum Biryani Family Pack', '₹500', 110),
  ('biryani', '', 'Spl Chicken Biryani Family Pack', '₹600', 120)
) AS v(category, group_name, name, price, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM menu_items LIMIT 1);