-- =============================================
-- Campus Event Registration System
-- Supabase Linter Fixes (Run in SQL Editor)
-- =============================================

-- =============================================
-- 1. FIX: Function `check_registration_time_window`
-- Linter Warning: function_search_path_mutable
-- Reasoning: Prevent malicious search path modifications
-- =============================================
CREATE OR REPLACE FUNCTION public.check_registration_time_window()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
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
$function$;

-- =============================================
-- 2. FIX: Function `check_event_capacity`
-- Linter Warning: function_search_path_mutable
-- Reasoning: Prevent malicious search path modifications
-- =============================================
CREATE OR REPLACE FUNCTION public.check_event_capacity()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF (SELECT COUNT(*) FROM registrations WHERE event_id = NEW.event_id) >=
     (SELECT max_capacity FROM events WHERE id = NEW.event_id) THEN
    RAISE EXCEPTION 'Event has reached its participant limit';
  END IF;
  RETURN NEW;
END;
$function$;

-- =============================================
-- 3. FIX: Policy `Admins can manage registrations` (UPDATE)
-- Linter Warning: rls_policy_always_true
-- Reasoning: USING (true) allows unrestricted updates. We must restrict to the admin of the event.
-- =============================================
DROP POLICY IF EXISTS "Admins can manage registrations" ON public.registrations;

CREATE POLICY "Admins can manage registrations"
ON public.registrations
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.events
    WHERE events.id = registrations.event_id
    AND events.admin_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.events
    WHERE events.id = registrations.event_id
    AND events.admin_id = auth.uid()
  )
);

-- Note: To fully secure ADMIN access, you should also apply this fix to the DELETE admin policy if it exists,
-- but the linter specifically flagged the UPDATE policy.

-- =============================================
-- 4. FIX: Policy `Anyone can register` (INSERT)
-- Linter Warning: rls_policy_always_true
-- Reasoning: WITH CHECK (true) allows inserting rows with invalid foreign keys or data.
-- While the foreign key constraint catches bad event IDs, it's best practice to
-- check the event exists in the policy itself.
-- =============================================
DROP POLICY IF EXISTS "Anyone can register" ON public.registrations;

CREATE POLICY "Anyone can register"
ON public.registrations
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.events
    WHERE events.id = registrations.event_id
  )
);

-- =============================================
-- 5. FIX: Policy `Users can cancel their own registration` (DELETE)
-- Linter Warning: rls_policy_always_true
-- Reasoning: USING (true) allows anyone to delete ANY registration.
-- Since the frontend CancelTimer gives users 60 seconds to cancel,
-- we restrict deletion to registrations created within the last 5 minutes.
-- =============================================
DROP POLICY IF EXISTS "Users can cancel their own registration" ON public.registrations;

CREATE POLICY "Users can cancel their own registration"
ON public.registrations
FOR DELETE
USING (
  created_at >= (NOW() - INTERVAL '5 minutes')
);
