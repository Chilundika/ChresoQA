import { NextResponse, type NextRequest } from 'next/server';
import { createMiddlewareSupabaseClient } from '@/lib/supabase-server';

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Allow the login page through — no redirect loop
    if (pathname === '/admin/login') {
        return NextResponse.next();
    }

    // Create a response we can modify (to set refreshed auth cookies)
    const response = NextResponse.next({ request });

    const supabase = createMiddlewareSupabaseClient(request, response);

    // Validate the session server-side
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        // No valid session → redirect to login before any HTML is streamed
        const loginUrl = request.nextUrl.clone();
        loginUrl.pathname = '/admin/login';
        return NextResponse.redirect(loginUrl);
    }

    // Verify the user is an admin by checking the admin_users table
    const { data: adminRecord, error: adminError } = await supabase
        .from('admin_users')
        .select('user_id')
        .eq('user_id', user.id)
        .single();

    if (adminError || !adminRecord) {
        // Authenticated but not an admin → redirect to login page with error
        const loginUrl = request.nextUrl.clone();
        loginUrl.pathname = '/admin/login';
        loginUrl.searchParams.set('error', 'unauthorized');
        
        // Optionally delete the session cookie so they aren't stuck logged in as a non-admin,
        // but Supabase SSR requires more setup for that. For now, the explicit error parameter
        // gives them visual feedback on the login page.
        return NextResponse.redirect(loginUrl);
    }

    // Authenticated admin — pass through with any refreshed cookies
    return response;
}

export const config = {
    matcher: ['/admin/:path*'],
};
