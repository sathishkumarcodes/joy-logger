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
  id: string;
  email: string;
  reminder_hour: number;
  reminder_enabled: boolean;
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
    const { data: usersToRemind, error: usersError } = await supabase
      .from("profiles")
      .select("id, email, reminder_hour, reminder_enabled, timezone")
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
          .eq("user_id", user.id)
          .eq("entry_date", today)
          .single();

        if (todayEntry) {
          console.log(`User ${user.id} already logged today, skipping`);
          continue;
        }

        // Check if it's the right hour for this user
        if (user.reminder_hour === currentHour) {
          if (!user.email) {
            console.log(`No email for user ${user.id}`);
            continue;
          }

          // Fetch user's last entry for personalization
          const { data: lastEntry } = await supabase
            .from("journal_entries")
            .select("entry_text, entry_date, mood_score")
            .eq("user_id", user.id)
            .order("entry_date", { ascending: false })
            .limit(1)
            .single();

          // Calculate streak
          const { data: allEntries } = await supabase
            .from("journal_entries")
            .select("entry_date")
            .eq("user_id", user.id)
            .order("entry_date", { ascending: false });

          let streakCount = 0;
          if (allEntries && allEntries.length > 0) {
            const dates = allEntries.map(e => e.entry_date);
            let currentDate = new Date(dates[0]);
            streakCount = 1;
            
            for (let i = 1; i < dates.length; i++) {
              const prevDate = new Date(dates[i]);
              const diffDays = Math.floor((currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
              
              if (diffDays === 1) {
                streakCount++;
                currentDate = prevDate;
              } else {
                break;
              }
            }
          }

          // Get total days for journey count
          const { count: totalDays } = await supabase
            .from("journal_entries")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id);

          const journeyDay = (totalDays || 0) + 1;

          // Create personalized content
          const lastEntryText = lastEntry ? lastEntry.entry_text.substring(0, 60) + (lastEntry.entry_text.length > 60 ? "..." : "") : "";
          const moodEmoji = lastEntry?.mood_score ? ["😔", "😕", "😐", "🙂", "😊"][lastEntry.mood_score - 1] : "✨";
          
          const reflectiveQuestions = [
            "What made today worth remembering?",
            "Who made your day better?",
            "What small moment brought you peace today?",
            "What are you grateful for right now?",
            "What made you smile today?"
          ];
          const randomQuestion = reflectiveQuestions[Math.floor(Math.random() * reflectiveQuestions.length)];

          // Send reminder email
          const { error: emailError } = await resend.emails.send({
            from: "OneGoodThing <onboarding@resend.dev>",
            to: [user.email],
            subject: streakCount > 0 ? `Day ${streakCount + 1} — What's your good thing today?` : "✨ What's your good thing today?",
            html: `
              <!DOCTYPE html>
              <html>
                <head>
                  <meta charset="utf-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                </head>
                <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #fefdfb;">
                  
                  <!-- Small Logo -->
                  <div style="text-align: center; margin-bottom: 32px; padding-top: 20px;">
                    <div style="display: inline-block; padding: 8px 16px; background: linear-gradient(135deg, #FFDAB9 0%, #FFB6A3 50%, #FFA07A 100%); border-radius: 20px;">
                      <span style="font-size: 18px; font-weight: 600; color: #fff;">☀️ OneGoodThing</span>
                    </div>
                  </div>

                  <!-- Personal Greeting -->
                  <div style="padding: 0 20px;">
                    ${streakCount > 0 ? `
                      <p style="font-size: 14px; color: #E07B39; font-weight: 600; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">
                        🔥 ${streakCount}-day streak
                      </p>
                    ` : ''}
                    
                    <h2 style="font-size: 24px; color: #2D2D2D; margin: 0 0 16px 0; font-weight: 600; line-height: 1.3;">
                      ${streakCount > 0 ? "You're on a roll." : "A moment just for you."}
                    </h2>
                    
                    <p style="font-size: 16px; color: #666; margin-bottom: 24px; line-height: 1.6;">
                      ${lastEntry ? `Yesterday, you reflected on: <em style="color: #E07B39;">"${lastEntryText}"</em> ${moodEmoji}` : "Today is day " + journeyDay + " of your journey."}
                    </p>

                    ${streakCount > 0 ? `
                      <p style="font-size: 16px; color: #666; margin-bottom: 28px; line-height: 1.6;">
                        Each day you show up, you're building something meaningful. Keep going.
                      </p>
                    ` : ''}

                    <!-- Reflective Question -->
                    <div style="background: linear-gradient(135deg, rgba(255, 218, 185, 0.3) 0%, rgba(255, 182, 163, 0.2) 100%); border-left: 3px solid #E07B39; border-radius: 8px; padding: 20px 24px; margin: 28px 0;">
                      <p style="font-size: 18px; color: #2D2D2D; margin: 0; font-weight: 500; font-style: italic;">
                        ${randomQuestion}
                      </p>
                    </div>

                    <p style="font-size: 15px; color: #666; margin: 24px 0; line-height: 1.6;">
                      It doesn't have to be big. A kind word, a quiet moment, something that made you pause — that counts.
                    </p>
                    
                    <!-- CTA -->
                    <div style="text-align: center; margin: 36px 0;">
                      <a href="${supabaseUrl.replace('.supabase.co', '.lovableproject.com')}" 
                         style="background: linear-gradient(135deg, #E07B39 0%, #D4916E 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; display: inline-block; box-shadow: 0 2px 12px rgba(224, 123, 57, 0.25); transition: transform 0.2s;">
                        Capture today's moment →
                      </a>
                    </div>
                    
                    <!-- Footer -->
                    <div style="margin-top: 48px; padding-top: 24px; border-top: 1px solid #E8E8E8; text-align: center;">
                      <p style="font-size: 13px; color: #999; margin: 0 0 8px 0; line-height: 1.5;">
                        This is day ${journeyDay} of your journey.
                      </p>
                      <p style="font-size: 13px; color: #999; margin: 0; line-height: 1.5;">
                        You can change your reminder time or turn these off in <a href="${supabaseUrl.replace('.supabase.co', '.lovableproject.com')}/settings" style="color: #E07B39; text-decoration: none;">settings</a>.
                      </p>
                    </div>
                  </div>
                </body>
              </html>
            `,
            text: `
OneGoodThing

${streakCount > 0 ? `🔥 ${streakCount}-day streak\n\n` : ''}${streakCount > 0 ? "You're on a roll." : "A moment just for you."}

${lastEntry ? `Yesterday, you reflected on: "${lastEntryText}" ${moodEmoji}\n\n` : `Today is day ${journeyDay} of your journey.\n\n`}${streakCount > 0 ? "Each day you show up, you're building something meaningful. Keep going.\n\n" : ''}${randomQuestion}

It doesn't have to be big. A kind word, a quiet moment, something that made you pause — that counts.

Capture today's moment: ${supabaseUrl.replace('.supabase.co', '.lovableproject.com')}

---
This is day ${journeyDay} of your journey.
Change your reminder time or turn these off: ${supabaseUrl.replace('.supabase.co', '.lovableproject.com')}/settings
            `.trim(),
          });

          if (emailError) {
            console.error(`Failed to send email to ${user.email}:`, emailError);
            errors.push(`${user.email}: ${emailError.message}`);
          } else {
            console.log(`Sent reminder to ${user.email}`);
            emailsSent.push(user.email);
          }
        }
      } catch (error: any) {
        console.error(`Error processing user ${user.id}:`, error);
        errors.push(`${user.id}: ${error.message}`);
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
