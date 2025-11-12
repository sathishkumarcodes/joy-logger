import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('AI service not configured');
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Database not configured');
    }

    // Fetch recent entries (last 30 days)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { data: entries, error } = await supabase
      .from('journal_entries')
      .select('entry_text, mood_score, entry_date, ai_reflection')
      .eq('user_id', userId)
      .gte('entry_date', thirtyDaysAgo.toISOString().split('T')[0])
      .order('entry_date', { ascending: false })
      .limit(30);

    if (error) {
      console.error('Database error:', error);
      throw new Error('Failed to fetch entries');
    }

    if (!entries || entries.length === 0) {
      return new Response(
        JSON.stringify({ insight: null }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare entries summary for AI
    const entriesSummary = entries.map(e => 
      `${e.entry_date}: "${e.entry_text}" (mood: ${e.mood_score || 'not tracked'})`
    ).join('\n');

    const systemPrompt = `You are a warm, insightful companion analyzing someone's recent journal entries. Your task is to write 2–3 warm, thoughtful sentences that:

1. Describe what's going on in their life based on patterns in their entries
2. Highlight emotional trends (e.g., "finding joy in small moments," "navigating challenges with resilience")
3. Note any recurring themes (e.g., relationships, nature, accomplishments, self-care)
4. Provide an uplifting, hopeful perspective

Important guidelines:
- Be genuine and personal, not generic
- Use a warm, conversational tone
- Avoid judgment, diagnosis, or advice
- Focus on what you observe, not what they should do
- Celebrate their journey and growth
- Keep it to 2-3 sentences maximum`;

    console.log('Generating life insight for', entries.length, 'entries');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: `Here are the recent journal entries:\n\n${entriesSummary}\n\nPlease provide a warm, insightful reflection about what's going on in this person's life.`
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI service unavailable. Please try again later.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI gateway returned ${response.status}`);
    }

    const data = await response.json();
    const insight = data.choices[0].message.content.trim();

    console.log('Generated life insight successfully');

    return new Response(
      JSON.stringify({ insight }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in generate-life-insight function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to generate insight' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
