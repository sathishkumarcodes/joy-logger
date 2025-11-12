import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { MoodSelector } from "./MoodSelector";

interface JournalPromptProps {
  onEntrySubmitted: () => void;
  hasEntryToday: boolean;
  userId: string;
}

export const JournalPrompt = ({ onEntrySubmitted, hasEntryToday, userId }: JournalPromptProps) => {
  const [entry, setEntry] = useState("");
  const [mood, setMood] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const MAX_CHARS = 240;

  const fireConfetti = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
  };

  const handleSubmit = async () => {
    if (!entry.trim()) {
      toast.error("Please write something first!");
      return;
    }

    if (entry.length > MAX_CHARS) {
      toast.error(`Please keep it under ${MAX_CHARS} characters`);
      return;
    }

    setIsSubmitting(true);

    try {
      // Generate AI reflection (and mood if not provided)
      const { data: reflectionData, error: reflectionError } = await supabase.functions.invoke(
        "generate-reflection",
        { body: { entryText: entry, moodScore: mood } }
      );

      if (reflectionError) throw reflectionError;

      // Save to database
      const { error: insertError } = await supabase
        .from("journal_entries")
        .insert({
          user_id: userId,
          entry_text: entry,
          ai_reflection: reflectionData.reflection,
          mood_score: reflectionData.moodScore || mood,
          entry_date: new Date().toISOString().split('T')[0]
        });

      if (insertError) throw insertError;

      fireConfetti();
      toast.success("Entry saved! ✨");
      setEntry("");
      setMood(null);
      onEntrySubmitted();
    } catch (error: any) {
      console.error("Error submitting entry:", error);
      toast.error(error.message || "Failed to save entry");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (hasEntryToday) {
    return (
      <Card className="p-8 text-center bg-card border-0 shadow-soft animate-scale-in">
        <Sparkles className="w-16 h-16 mx-auto mb-4 text-primary animate-float" strokeWidth={2} />
        <h2 className="text-2xl font-semibold text-foreground mb-3">
          You've captured a good thing today
        </h2>
        <p className="text-muted-foreground text-base">
          Come back tomorrow to find another moment to appreciate.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-8 bg-gradient-to-br from-background to-accent/30 shadow-soft">
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">
            What's one good thing that happened today?
          </h1>
          <p className="text-muted-foreground">
            Take a moment to reflect on something positive
          </p>
        </div>

        <MoodSelector 
          value={mood} 
          onChange={setMood} 
          disabled={isSubmitting}
        />

        <div className="space-y-2">
          <Textarea
            value={entry}
            onChange={(e) => setEntry(e.target.value)}
            placeholder="I'm grateful for..."
            className="min-h-[120px] text-lg resize-none border-2 focus:border-primary transition-all"
            disabled={isSubmitting}
            maxLength={MAX_CHARS}
          />
          <div className="text-right text-sm text-muted-foreground">
            {entry.length} / {MAX_CHARS}
          </div>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || !entry.trim()}
          className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-primary to-primary-glow hover:shadow-glow transition-all"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Reflecting...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-5 w-5" />
              Save & Reflect
            </>
          )}
        </Button>
      </div>
    </Card>
  );
};