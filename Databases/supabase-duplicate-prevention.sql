-- =============================================
-- Duplicate Prevention Migration
-- Run this in your Supabase SQL Editor
-- =============================================

-- 1. Add the IP address column
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS ip_address TEXT;

-- 2. Unique constraint: same IP cannot register for same event twice
ALTER TABLE registrations 
ADD CONSTRAINT unique_event_registration_per_ip 
UNIQUE (event_id, ip_address);

-- 3. Unique constraint: same email cannot register for same event twice
ALTER TABLE registrations 
ADD CONSTRAINT unique_event_registration_per_email 
UNIQUE (event_id, email);
