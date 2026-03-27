-- =============================================
-- Campus Event Registration System
-- Supabase Upgrade v3: Manual Registration Control and Historical Archiving
-- =============================================

-- 1. Add manual toggle for registration control
ALTER TABLE events ADD COLUMN IF NOT EXISTS is_open BOOLEAN DEFAULT TRUE;

-- 2. Ensure registrations are deleted when an event is deleted
ALTER TABLE registrations
DROP CONSTRAINT IF EXISTS registrations_event_id_fkey,
ADD CONSTRAINT registrations_event_id_fkey
   FOREIGN KEY (event_id)
   REFERENCES events(id)
   ON DELETE CASCADE;

-- 3. Create a view for historical events (events strictly in the past)
CREATE OR REPLACE VIEW past_events AS
SELECT * 
FROM events
WHERE start_timestamp < NOW();
