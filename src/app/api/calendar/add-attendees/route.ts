import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
    try {
        const cookieStore = await cookies();
        let accessToken = cookieStore.get('gcal_access_token')?.value;
        const refreshToken = cookieStore.get('gcal_refresh_token')?.value;

        if (!accessToken && !refreshToken) {
            return NextResponse.json({ error: 'Not authenticated with Google' }, { status: 401 });
        }

        // Refresh token if needed
        if (!accessToken && refreshToken) {
            const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    client_id: process.env.GOOGLE_CLIENT_ID!,
                    client_secret: process.env.GOOGLE_CLIENT_SECRET!,
                    refresh_token: refreshToken,
                    grant_type: 'refresh_token'
                })
            });
            const tokenData = await tokenRes.json();
            if (tokenData.access_token) {
                accessToken = tokenData.access_token;
                cookieStore.set('gcal_access_token', accessToken as string, { maxAge: tokenData.expires_in, path: '/' });
            } else {
                return NextResponse.json({ error: 'Failed to refresh token' }, { status: 401 });
            }
        }

        const { meetUrl, emails } = await req.json();

        if (!meetUrl) {
            return NextResponse.json({ error: 'Meet URL is required to find the Calendar event' }, { status: 400 });
        }

        // 1. Search for the Calendar event using the query
        const searchRes = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?q=${encodeURIComponent(meetUrl)}`, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });
        const searchData = await searchRes.json();

        if (!searchData.items || searchData.items.length === 0) {
            return NextResponse.json({ error: 'No Calendar event found containing this Meet URL in the primary calendar.' }, { status: 404 });
        }

        const gEvent = searchData.items[0];
        const existingAttendees = gEvent.attendees || [];

        // 2. Merge attendees
        const newEmails = emails.map((e: string) => ({ email: e }));
        const mergedAttendees = [...existingAttendees];
        for (const ne of newEmails) {
            if (!mergedAttendees.some((a: any) => a.email === ne.email)) {
                mergedAttendees.push(ne);
            }
        }

        // 3. Patch the event
        const patchRes = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${gEvent.id}?sendUpdates=all`, {
            method: 'PATCH',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                attendees: mergedAttendees
            })
        });

        const patchData = await patchRes.json();

        if (patchData.error) {
            return NextResponse.json({ error: patchData.error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, count: mergedAttendees.length });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
