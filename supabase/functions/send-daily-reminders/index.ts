import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

async function sendEmail(to: string, subject: string, html: string) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "OneGoodThing <onboarding@resend.dev>",
      to: [to],
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to send email: ${error}`);
  }

  return await response.json();
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting daily reminder job...");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get all profiles with reminders enabled
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("*")
      .eq("reminder_enabled", true);

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      throw profilesError;
    }

    console.log(`Found ${profiles?.length || 0} users with reminders enabled`);

    const currentDate = new Date();
    let emailsSent = 0;

    for (const profile of profiles || []) {
      try {
        // Convert current UTC time to user's timezone
        const userTime = new Date(
          currentDate.toLocaleString("en-US", { timeZone: profile.timezone || "UTC" })
        );
        const userHour = userTime.getHours();

        console.log(`User ${profile.email}: timezone=${profile.timezone}, hour=${userHour}, reminderHour=${profile.reminder_hour}`);

        // Check if current hour matches user's reminder hour
        if (userHour === profile.reminder_hour) {
          // Check if user has already logged today
          const today = userTime.toISOString().split("T")[0];
          const { data: todayEntry } = await supabase
            .from("journal_entries")
            .select("id")
            .eq("user_id", profile.id)
            .eq("entry_date", today)
            .single();

          // Only send reminder if they haven't logged today
          if (!todayEntry) {
            console.log(`Sending reminder to ${profile.email}`);
            
            await sendEmail(
              profile.email,
              "✨ Your daily OneGoodThing reminder",
              `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                  <h2 style="color: #f59e0b;">✨ OneGoodThing</h2>
                  <p>Hi there!</p>
                  <p>It's time to capture today's one good thing. Take a moment to reflect on something positive that happened today.</p>
                  <p>
                    <a href="${Deno.env.get("SUPABASE_URL") || ""}" 
                       style="background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; margin: 20px 0;">
                      Log Your OneGoodThing
                    </a>
                  </p>
                  <p style="color: #666; font-size: 14px;">Keep your joy streak going! 🔥</p>
                </div>
              `
            );

            emailsSent++;
            console.log(`Successfully sent reminder to ${profile.email}`);
          } else {
            console.log(`User ${profile.email} already logged today, skipping`);
          }
        }
      } catch (userError) {
        console.error(`Error processing user ${profile.email}:`, userError);
        // Continue with next user
      }
    }

    console.log(`Job complete. Sent ${emailsSent} reminder emails`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        emailsSent,
        totalUsers: profiles?.length || 0 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Error in send-daily-reminders function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
