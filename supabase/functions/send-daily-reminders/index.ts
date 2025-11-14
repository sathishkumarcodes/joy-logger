import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface UserToRemind {
  user_id: string;
  email: string;
  reminder_time: string;
  timezone: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting daily reminders check...");
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get current hour in UTC
    const now = new Date();
    const currentHour = now.getUTCHours();
    const currentMinute = now.getUTCMinutes();
    
    console.log(`Current UTC time: ${currentHour}:${currentMinute}`);

    // Find users who should receive reminders at this hour
    // We check for times within the current hour (with 5-minute buffer)
    const { data: usersToRemind, error: usersError } = await supabase
      .from("user_preferences")
      .select(`
        user_id,
        reminder_time,
        timezone,
        profiles!inner(email)
      `)
      .eq("reminder_enabled", true);

    if (usersError) {
      console.error("Error fetching users:", usersError);
      throw usersError;
    }

    if (!usersToRemind || usersToRemind.length === 0) {
      console.log("No users with reminders enabled");
      return new Response(
        JSON.stringify({ message: "No users to remind" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${usersToRemind.length} users with reminders enabled`);

    // Check if user has already logged today
    const today = now.toISOString().split('T')[0];
    
    const emailsSent: string[] = [];
    const errors: string[] = [];

    for (const user of usersToRemind) {
      try {
        // Check if user has already logged today
        const { data: todayEntry } = await supabase
          .from("journal_entries")
          .select("id")
          .eq("user_id", user.user_id)
          .eq("entry_date", today)
          .single();

        if (todayEntry) {
          console.log(`User ${user.user_id} already logged today, skipping`);
          continue;
        }

        // Parse reminder time (format: HH:MM:SS)
        const [hour] = user.reminder_time.split(':').map(Number);
        
        // Simple timezone-aware check - for now we'll use UTC offset
        // For production, consider using a proper timezone library
        if (hour === currentHour) {
          const email = (user as any).profiles.email;
          
          if (!email) {
            console.log(`No email for user ${user.user_id}`);
            continue;
          }

          // Send reminder email
          const { error: emailError } = await resend.emails.send({
            from: "Joy Logger <onboarding@resend.dev>",
            to: [email],
            subject: "✨ Time to capture today's joy",
            html: `
              <!DOCTYPE html>
              <html>
                <head>
                  <meta charset="utf-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                </head>
                <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 16px; padding: 40px 30px; text-align: center; margin-bottom: 30px;">
                    <h1 style="color: white; margin: 0 0 10px 0; font-size: 32px;">✨ A moment for you</h1>
                    <p style="color: rgba(255, 255, 255, 0.9); margin: 0; font-size: 18px;">What brought you joy today?</p>
                  </div>
                  
                  <div style="padding: 0 20px;">
                    <p style="font-size: 16px; margin-bottom: 20px;">
                      Hey there! 👋
                    </p>
                    
                    <p style="font-size: 16px; margin-bottom: 20px;">
                      Remember: it doesn't have to be big. Maybe it was:
                    </p>
                    
                    <ul style="font-size: 16px; margin-bottom: 25px; padding-left: 20px;">
                      <li style="margin-bottom: 8px;">☕ That perfect cup of coffee</li>
                      <li style="margin-bottom: 8px;">🎵 A song that made you smile</li>
                      <li style="margin-bottom: 8px;">💬 A text from someone you love</li>
                      <li style="margin-bottom: 8px;">🌤️ The way the light looked through your window</li>
                    </ul>
                    
                    <p style="font-size: 16px; margin-bottom: 25px;">
                      These small moments add up. Take 60 seconds to log it — your future self will thank you.
                    </p>
                    
                    <div style="text-align: center; margin: 35px 0;">
                      <a href="${supabaseUrl.replace('.supabase.co', '.lovableproject.com')}" 
                         style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px; display: inline-block; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">
                        Log Today's Joy →
                      </a>
                    </div>
                    
                    <div style="margin-top: 40px; padding-top: 25px; border-top: 1px solid #e5e5e5;">
                      <p style="font-size: 14px; color: #666; margin: 0;">
                        These daily reminders help you build the habit. You can adjust the time or turn them off anytime in your settings.
                      </p>
                    </div>
                  </div>
                </body>
              </html>
            `,
          });

          if (emailError) {
            console.error(`Failed to send email to ${email}:`, emailError);
            errors.push(`${email}: ${emailError.message}`);
          } else {
            console.log(`Sent reminder to ${email}`);
            emailsSent.push(email);
          }
        }
      } catch (error: any) {
        console.error(`Error processing user ${user.user_id}:`, error);
        errors.push(`${user.user_id}: ${error.message}`);
      }
    }

    console.log(`Reminders sent: ${emailsSent.length}, Errors: ${errors.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        emailsSent: emailsSent.length,
        errors: errors.length > 0 ? errors : undefined,
        recipients: emailsSent,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in send-daily-reminders:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);
