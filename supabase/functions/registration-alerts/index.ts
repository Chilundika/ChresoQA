import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from 'https://esm.sh/resend@3.2.0'

const resend = new Resend(Deno.env.get('RESEND_API_KEY'))

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const payload = await req.json()

        // This function handles the "INSERT" webhook on the registrations table
        if (payload.type !== 'INSERT' || !payload.record) {
            return new Response(JSON.stringify({ error: 'Invalid payload' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            })
        }

        const registration = payload.record
        const eventId = registration.event_id

        // Initialize Supabase client
        const supabaseUrl = Deno.env.get('NEXT_PUBLIC_SUPABASE_URL')
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

        if (!supabaseUrl || !supabaseServiceKey) {
            throw new Error('Supabase configuration missing')
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        // Count current registrations
        const { count, error: countError } = await supabase
            .from('registrations')
            .select('*', { count: 'exact', head: true })
            .eq('event_id', eventId)

        if (countError) throw countError

        const currentCount = count || 0

        // Get Event Details
        const { data: event, error: eventError } = await supabase
            .from('events')
            .select('title, max_capacity, admin_id')
            .eq('id', eventId)
            .single()

        if (eventError || !event) throw new Error('Event not found')

        const maxCapacity = event.max_capacity

        // Check if we hit exactly 50% or 100% capacity
        const isHalfCapacity = currentCount === Math.floor(maxCapacity / 2)
        const isFullCapacity = currentCount === maxCapacity

        if (isHalfCapacity || isFullCapacity) {
            // Get Admin User Email
            const { data: adminUser, error: adminError } = await supabase.auth.admin.getUserById(event.admin_id)

            // Fallback email if auth admin fails
            const adminEmail = adminUser?.user?.email || 'admin@example.com'

            const milestone = isFullCapacity ? '100% (FULL)' : '50%'
            const subject = `Event Capacity Alert: ${event.title} is at ${milestone}`
            const htmlContent = `
                <h2>Event Capacity Milestone Reached</h2>
                <p><strong>Event:</strong> ${event.title}</p>
                <p><strong>Current Registrations:</strong> ${currentCount} / ${maxCapacity}</p>
                <p>This is an automated alert from the Campus Event Registration System.</p>
            `

            // Send Email using Resend
            const emailData = await resend.emails.send({
                from: 'Events <onboarding@resend.dev>',
                to: [adminEmail],
                subject: subject,
                html: htmlContent,
            })

            return new Response(JSON.stringify({ success: true, milestone, emailData }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            })
        }

        return new Response(JSON.stringify({ success: true, message: 'No alert triggered' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error) {
        console.error('Webhook Error:', error)
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        })
    }
})
