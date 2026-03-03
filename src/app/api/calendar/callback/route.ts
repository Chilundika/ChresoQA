import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(req: Request) {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state'); // Database event ID

    if (!code) return new Response('No authorization code provided', { status: 400 });

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = `${url.origin}/api/calendar/callback`;

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            code,
            client_id: clientId!,
            client_secret: clientSecret!,
            redirect_uri: redirectUri,
            grant_type: 'authorization_code'
        })
    });

    const tokenData = await tokenRes.json();
    if (tokenData.error) {
        return new Response('Auth error: ' + tokenData.error, { status: 500 });
    }

    const cookieStore = await cookies();
    cookieStore.set('gcal_access_token', tokenData.access_token, { maxAge: tokenData.expires_in, path: '/' });
    if (tokenData.refresh_token) {
        cookieStore.set('gcal_refresh_token', tokenData.refresh_token, { maxAge: 30 * 24 * 60 * 60, path: '/' });
    }

    return NextResponse.redirect(`${url.origin}/admin/events/${state}?authed=true`);
}
