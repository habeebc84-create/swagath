CREATE TABLE IF NOT EXISTS catering_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  event_type TEXT NOT NULL,
  guest_count INTEGER NOT NULL DEFAULT 20,
  event_date DATE,
  event_location TEXT,
  package_interest TEXT,
  dietary_notes TEXT,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);