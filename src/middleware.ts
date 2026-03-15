import { NextResponse, type NextRequest } from 'next/server';
import { createMiddlewareSupabaseClient } from '@/lib/supabase-server';

export async function middleware(request: NextRequest) {
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

    // Authenticated — pass through with any refreshed cookies
    return response;
}

export const config = {
    matcher: ['/admin/:path*'],
};
