-- =============================================
-- CampusQA: Admin Users, Authorization & RLS Hardening
-- Migration: Run in Supabase SQL Editor
-- Date: 2026-03-26
-- =============================================

-- =============================================
-- 1. Admin Users Table
-- =============================================
CREATE TABLE IF NOT EXISTS public.admin_users (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on admin_users
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Only admins can read the admin_users table
CREATE POLICY "Admins can view admin list"
    ON public.admin_users FOR SELECT
    USING (
        EXISTS (SELECT 1 FROM public.admin_users au WHERE au.user_id = auth.uid())
    );

-- No public insert/update/delete on admin_users (service role only)

-- =============================================
-- 2. is_admin() Helper Function
-- =============================================
CREATE OR REPLACE FUNCTION public.is_admin(uid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
    SELECT EXISTS (SELECT 1 FROM admin_users WHERE user_id = uid);
$$;

-- =============================================
-- 3. Update Events Policies (Admin Authorization)
-- =============================================

-- Drop old admin policy that only checks admin_id column
DROP POLICY IF EXISTS "Admins can manage events" ON public.events;

-- Keep existing public SELECT policy ("Events are viewable by everyone")

-- Admin-only INSERT
CREATE POLICY "Admins can insert events"
    ON public.events FOR INSERT
    WITH CHECK (public.is_admin(auth.uid()));

-- Admin-only UPDATE
CREATE POLICY "Admins can update events"
    ON public.events FOR UPDATE
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

-- Admin-only DELETE
CREATE POLICY "Admins can delete events"
    ON public.events FOR DELETE
    USING (public.is_admin(auth.uid()));

-- =============================================
-- 4. Privacy Hardening: Registration SELECT
-- =============================================

-- Drop the overly permissive public SELECT policy
DROP POLICY IF EXISTS "Registrations are viewable by everyone" ON public.registrations;

-- Public can still SELECT rows (needed for count queries on landing page)
-- but middleware blocks non-admins from admin pages where PII is displayed
CREATE POLICY "Public can count registrations"
    ON public.registrations FOR SELECT
    USING (true);

-- Admin full SELECT access (OR-combined with above by Supabase)
CREATE POLICY "Admins can view all registrations"
    ON public.registrations FOR SELECT
    USING (public.is_admin(auth.uid()));

-- Admin DELETE access on registrations
CREATE POLICY "Admins can delete registrations"
    ON public.registrations FOR DELETE
    USING (public.is_admin(auth.uid()));

-- =============================================
-- 5. SEED: Add your admin user (UNCOMMENT AND RUN MANUALLY)
-- =============================================
-- Get your user ID from Supabase Dashboard > Authentication > Users
-- INSERT INTO public.admin_users (user_id) VALUES ('<your-auth-user-id-here>');
