import { useState, useEffect } from "react";
import { JournalPrompt } from "@/components/JournalPrompt";
import { StreakCounter } from "@/components/StreakCounter";
import { EntryHistory } from "@/components/EntryHistory";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

const Index = () => {
  const [entries, setEntries] = useState<any[]>([]);
  const [streak, setStreak] = useState(0);
  const [hasEntryToday, setHasEntryToday] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const getDeviceId = () => {
    let deviceId = localStorage.getItem("journal_device_id");
    if (!deviceId) {
      deviceId = crypto.randomUUID();
      localStorage.setItem("journal_device_id", deviceId);
    }
    return deviceId;
  };

  const calculateStreak = (entries: any[]) => {
    if (entries.length === 0) return 0;

    const sortedEntries = [...entries].sort(
      (a, b) => new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime()
    );

    let currentStreak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < sortedEntries.length; i++) {
      const entryDate = new Date(sortedEntries[i].entry_date);
      entryDate.setHours(0, 0, 0, 0);

      const expectedDate = new Date(today);
      expectedDate.setDate(today.getDate() - currentStreak);

      if (entryDate.getTime() === expectedDate.getTime()) {
        currentStreak++;
      } else {
        break;
      }
    }

    return currentStreak;
  };

  const fetchEntries = async () => {
    setIsLoading(true);
    try {
      const deviceId = getDeviceId();
      const { data, error } = await supabase
        .from("journal_entries")
        .select("*")
        .eq("device_id", deviceId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setEntries(data || []);
      
      // Check if there's an entry today
      const today = new Date().toISOString().split('T')[0];
      const todayEntry = data?.find(entry => entry.entry_date === today);
      setHasEntryToday(!!todayEntry);

      // Calculate streak
      const currentStreak = calculateStreak(data || []);
      setStreak(currentStreak);
    } catch (error) {
      console.error("Error fetching entries:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-accent/20 to-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/20 to-background">
      <div className="container max-w-4xl mx-auto px-4 py-12">
        <div className="space-y-8">
          {/* Header with Streak */}
          <div className="text-center space-y-4">
            <h1 className="text-5xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
              Daily Gratitude
            </h1>
            <p className="text-muted-foreground text-lg">
              One good thing, every day ✨
            </p>
          </div>

          {/* Streak Counter */}
          <StreakCounter streak={streak} />

          {/* Journal Prompt */}
          <JournalPrompt 
            onEntrySubmitted={fetchEntries}
            hasEntryToday={hasEntryToday}
          />

          {/* Entry History */}
          <EntryHistory entries={entries} />
        </div>
      </div>
    </div>
  );
};

export default Index;