import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // 1. Save to Supabase
    const { error: dbError } = await supabaseAdmin
      .from("newsletter_subscriptions")
      .upsert([{ email }], { onConflict: 'email' });

    if (dbError) {
      console.error("Database error:", dbError);
      return NextResponse.json({ error: "Failed to save subscription" }, { status: 500 });
    }

    // 2. Send Welcome Email via Resend
    try {
      await resend.emails.send({
        from: "CampusQA <onboarding@resend.dev>", // Or your verified domain
        to: email,
        subject: "Welcome to CampusQA Newsletter! 🚀",
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h1 style="color: #4A148C;">Welcome to CampusQA!</h1>
            <p>Hi there,</p>
            <p>Thank you for subscribing to our newsletter. You'll now be the first to know about:</p>
            <ul>
              <li>Upcoming Campus Events</li>
              <li>New Tutorials & Workshops</li>
              <li>Live Q&A Sessions</li>
            </ul>
            <p>Stay tuned for more updates!</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="font-size: 0.8em; color: #666;">
              &copy; ${new Date().getFullYear()} DeZignBlu-Print ZM. Campus Registration.
            </p>
          </div>
        `,
      });
    } catch (emailError) {
      console.error("Email error:", emailError);
      // We don't fail the whole request if the email fails, but we log it
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Subscription error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
