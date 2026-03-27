-- Fix recursive policy on admin_users table
DROP POLICY IF EXISTS "Admins can view admin list" ON public.admin_users;
DROP POLICY IF EXISTS "Users can read their own admin status" ON public.admin_users;

-- Admin can read all admins (using SECURITY DEFINER function to bypass recursion)
CREATE POLICY "Admins can view admin list"
    ON public.admin_users FOR SELECT
    USING (public.is_admin(auth.uid()));

-- Users can check their own admin status directly
CREATE POLICY "Users can read their own admin status"
    ON public.admin_users FOR SELECT
    USING (user_id = auth.uid());
