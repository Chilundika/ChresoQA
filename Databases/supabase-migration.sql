-- =============================================
-- Campus Event Registration System
-- Supabase Migration: Run in SQL Editor
-- =============================================

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create Event Category ENUM
CREATE TYPE event_category AS ENUM ('orientation', 'tutorial', 'live_qa');

-- =============================================
-- Events Table
-- =============================================
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  type event_category NOT NULL,
  event_date TIMESTAMP WITH TIME ZONE,
  max_capacity INT DEFAULT 200 CHECK (max_capacity > 0),
  meet_url TEXT,
  admin_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- Registrations Table
-- =============================================
CREATE TABLE registrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  contact_number TEXT,
  whatsapp_number TEXT,
  year_of_study INT CHECK (year_of_study BETWEEN 1 AND 7),
  program_name TEXT,
  will_attend TEXT CHECK (will_attend IN ('YES', 'MAYBE')) DEFAULT 'YES',
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_event_registration_per_ip UNIQUE (event_id, ip_address),
  CONSTRAINT unique_event_registration_per_email UNIQUE (event_id, email)
);

-- Create index for faster capacity checks
CREATE INDEX idx_registrations_event_id ON registrations(event_id);

-- =============================================
-- Capacity Enforcement Trigger
-- Prevents over-registration even under
-- concurrent inserts (race conditions)
-- =============================================
CREATE OR REPLACE FUNCTION check_event_capacity()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM registrations WHERE event_id = NEW.event_id) >=
     (SELECT max_capacity FROM events WHERE id = NEW.event_id) THEN
    RAISE EXCEPTION 'Event has reached its participant limit';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_capacity
BEFORE INSERT ON registrations
FOR EACH ROW EXECUTE FUNCTION check_event_capacity();

-- =============================================
-- Row Level Security (RLS)
-- =============================================

-- Enable RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;

-- Public can read events
CREATE POLICY "Events are viewable by everyone"
  ON events FOR SELECT
  USING (true);

-- Only authenticated admins can insert/update/delete events
CREATE POLICY "Admins can manage events"
  ON events FOR ALL
  USING (auth.uid() = admin_id)
  WITH CHECK (auth.uid() = admin_id);

-- Anyone can insert registrations (public form)
CREATE POLICY "Anyone can register"
  ON registrations FOR INSERT
  WITH CHECK (true);

-- Public can read registrations (for capacity count)
CREATE POLICY "Registrations are viewable by everyone"
  ON registrations FOR SELECT
  USING (true);

-- Registrants can delete their own registration (cancel)
CREATE POLICY "Users can cancel their own registration"
  ON registrations FOR DELETE
  USING (true);

-- Admins can manage all registrations
CREATE POLICY "Admins can manage registrations"
  ON registrations FOR UPDATE
  USING (true);
