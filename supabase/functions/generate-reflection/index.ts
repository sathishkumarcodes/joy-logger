import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { entryText, moodScore } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY is not configured');
      throw new Error('AI service not configured');
    }

    console.log('Generating reflection for entry:', entryText, 'Mood:', moodScore);

    // Build messages based on whether mood analysis is needed
    const needsMoodAnalysis = moodScore === null || moodScore === undefined;
    const systemPrompt = needsMoodAnalysis
      ? 'You are a gentle, encouraging journaling companion. When someone shares something good that happened to them, respond with: 1) A warm, brief reflection (2-3 sentences max) that acknowledges their moment, celebrates it with them, and offers a small insight or affirmation. 2) A mood score from 1-5 based on their entry (1=rough, 2=meh, 3=okay, 4=good, 5=great). Be genuine, uplifting, and human. Format: First the reflection, then on a new line "MOOD: X" where X is 1-5.'
      : 'You are a gentle, encouraging journaling companion. When someone shares something good that happened to them, respond with a warm, brief reflection (2-3 sentences max) that acknowledges their moment, celebrates it with them, and offers a small insight or affirmation. Be genuine, uplifting, and human. Avoid being overly cheerful or generic.';

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
            content: `Today's good thing: ${entryText}`
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
    const fullResponse = data.choices[0].message.content;

    // Parse mood if AI was asked to analyze it
    let reflection = fullResponse;
    let analyzedMood = moodScore;
    
    if (needsMoodAnalysis) {
      const moodMatch = fullResponse.match(/MOOD:\s*(\d)/);
      if (moodMatch) {
        analyzedMood = parseInt(moodMatch[1]);
        reflection = fullResponse.replace(/\s*MOOD:\s*\d\s*$/, '').trim();
      }
    }

    console.log('Generated reflection successfully, mood:', analyzedMood);

    return new Response(
      JSON.stringify({ reflection, moodScore: analyzedMood }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in generate-reflection function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to generate reflection' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});