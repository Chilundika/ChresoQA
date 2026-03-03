-- =============================================
-- Campus Event Registration System
-- Supabase Upgrade v4: Archive Management Enhancement
-- =============================================

-- Add manual "archived" boolean to the events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;
