import { NextResponse } from 'next/server';

export async function GET(req: Request) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = `${new URL(req.url).origin}/api/calendar/callback`;
    const eventId = new URL(req.url).searchParams.get('eventId');

    if (!clientId) {
        return new Response('Missing GOOGLE_CLIENT_ID in environment variables', { status: 500 });
    }

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` + new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'https://www.googleapis.com/auth/calendar.events',
        access_type: 'offline',
        prompt: 'consent',
        state: eventId || '',
    }).toString();

    return NextResponse.redirect(authUrl);
}
