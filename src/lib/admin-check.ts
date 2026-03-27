import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Server-side utility: checks if the currently authenticated user
 * is in the admin_users table.
 *
 * Usage in API routes:
 *   const supabase = await createServerSupabaseClient();
 *   const isAdmin = await checkIsAdmin(supabase);
 *   if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
 */
export async function checkIsAdmin(supabase: SupabaseClient): Promise<boolean> {
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) return false;

    const { data, error } = await supabase
        .from('admin_users')
        .select('user_id')
        .eq('user_id', user.id)
        .single();

    return !error && !!data;
}
