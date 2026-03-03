-- =============================================
-- Campus Event Registration System
-- Supabase Upgrade: Run in SQL Editor
-- =============================================

-- 1. Add start_timestamp to the events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS start_timestamp TIMESTAMP WITH TIME ZONE;

-- 2. Create function and trigger to enforce the 2-hour window
CREATE OR REPLACE FUNCTION check_registration_time_window()
RETURNS TRIGGER AS $$
DECLARE
  v_start_timestamp TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get the start_timestamp of the event
  SELECT start_timestamp INTO v_start_timestamp
  FROM events
  WHERE id = NEW.event_id;

  -- If start_timestamp is set, enforce the 2-hour rule
  IF v_start_timestamp IS NOT NULL THEN
    -- Check if current time is strictly greater than 2 hours before the event starts
    IF NOW() > (v_start_timestamp - INTERVAL '2 hours') THEN
      RAISE EXCEPTION 'Registration closed: Event starts in less than 2 hours.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists to prevent duplicates on rerun
DROP TRIGGER IF EXISTS enforce_time_window ON registrations;

-- 3. Attach the trigger to the registrations table
CREATE TRIGGER enforce_time_window
BEFORE INSERT ON registrations
FOR EACH ROW EXECUTE FUNCTION check_registration_time_window();
