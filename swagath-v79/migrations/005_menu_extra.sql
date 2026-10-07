-- Extra categories matching website tabs
INSERT INTO menu_items (category, group_name, name, price, sort_order)
SELECT v.category, v.group_name, v.name, v.price, v.sort_order
FROM (VALUES
  ('tandoori', '', 'Seekh / Tangdi / Kalmi Kabab (Half)', '₹180', 10),
  ('tandoori', '', 'Chicken Tikka · Malai · Reshmi', '₹200–240', 20),
  ('tandoori', '', 'Tandoori Chicken Half / Full', '₹250 / ₹480', 30),
  ('tandoori', '', 'Fish / Prawns Tikka', '₹250–320', 40),
  ('egg-mutton', '', 'Egg 65 / Chilli / Manchurian / Roast', '₹160–170', 10),
  ('egg-mutton', '', 'Fish starters (Apollo, 65, Pepper…)', '₹250', 20),
  ('egg-mutton', '', 'Prawns Fry / 65 / Dragon', '₹260–280', 30),
  ('egg-mutton', '', 'Mutton Fry / Sukka / Ghee Roast', '₹300–330', 40)
) AS v(category, group_name, name, price, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM menu_items m WHERE m.category = v.category AND m.name = v.name
);