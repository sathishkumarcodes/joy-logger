import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { JournalPrompt } from "@/components/JournalPrompt";
import { StreakCounter } from "@/components/StreakCounter";
import { EntryHistory } from "@/components/EntryHistory";
import { LifeInsight } from "@/components/LifeInsight";
import { MemoryResurfacing } from "@/components/MemoryResurfacing";
import { SocialShare } from "@/components/SocialShare";
import { ShareableReflectionCard } from "@/components/ShareableReflectionCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Loader2, Settings, LogOut, BarChart3, Calendar, Sparkles, Share2 } from "lucide-react";
import { JourneySummary } from "@/components/JourneySummary";

const Index = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [entries, setEntries] = useState<any[]>([]);
  const [streak, setStreak] = useState(0);
  const [hasEntryToday, setHasEntryToday] = useState(false);
  const [todayEntry, setTodayEntry] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showShareableCard, setShowShareableCard] = useState(false);

  const calculateStreak = (entries: any[]) => {
    if (entries.length === 0) return 0;

    const sortedEntries = [...entries].sort(
      (a, b) => new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime()
    );

    let currentStreak = 0;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    for (let i = 0; i < sortedEntries.length; i++) {
      const entryDateStr = sortedEntries[i].entry_date; // YYYY-MM-DD format
      const [year, month, day] = entryDateStr.split('-').map(Number);
      const entryDate = new Date(year, month - 1, day);

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
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("journal_entries")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setEntries(data || []);
      
      // Check if there's an entry today (using local date, not UTC)
      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const todayEntryData = data?.find(entry => entry.entry_date === today);
      setHasEntryToday(!!todayEntryData);
      setTodayEntry(todayEntryData || null);

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
    if (!authLoading) {
      if (!user) {
        navigate("/auth");
      } else {
        fetchEntries();
      }
    }
  }, [user, authLoading, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-accent/20 to-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/20 to-background">
      <div className="container max-w-3xl mx-auto px-4 py-8 sm:py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-10 animate-fade-up">
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
            OneGoodThing
          </h1>
          <div className="flex gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate("/timeline")}
                  className="hover:bg-card/50 hover:scale-110 transition-all"
                >
                  <Calendar className="w-5 h-5 text-muted-foreground" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Timeline</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate("/insights")}
                  className="hover:bg-card/50 hover:scale-110 transition-all"
                >
                  <Sparkles className="w-5 h-5 text-muted-foreground" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Insights</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate("/stats")}
                  className="hover:bg-card/50 hover:scale-110 transition-all"
                >
                  <BarChart3 className="w-5 h-5 text-muted-foreground" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Stats</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate("/settings")}
                  className="hover:bg-card/50 hover:scale-110 transition-all"
                >
                  <Settings className="w-5 h-5 text-muted-foreground" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Settings</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleSignOut}
                  className="hover:bg-card/50 hover:scale-110 transition-all"
                >
                  <LogOut className="w-5 h-5 text-muted-foreground" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Logout</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        <div className="space-y-10">

          {/* Streak Counter */}
          <StreakCounter streak={streak} />

          {/* Primary Action - Journal Prompt */}
          <div className="animate-fade-up" style={{ animationDelay: "0.05s", animationFillMode: "both" }}>
            <JournalPrompt 
              onEntrySubmitted={fetchEntries}
              hasEntryToday={hasEntryToday}
              userId={user.id}
            />
          </div>

          {/* Shareable Card CTA - Show after entry is submitted */}
          {todayEntry && (
            <div className="animate-fade-up" style={{ animationDelay: "0.08s", animationFillMode: "both" }}>
              <Card className="p-8 bg-gradient-to-br from-primary/20 via-accent/20 to-primary/10 border-2 border-primary/30 shadow-lg">
                <div className="flex flex-col items-center gap-6 text-center">
                  <div className="space-y-3">
                    <div className="flex items-center justify-center gap-2">
                      <Sparkles className="w-6 h-6 text-primary animate-pulse" />
                      <h3 className="font-bold text-2xl bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
                        Share Your Good Thing!
                      </h3>
                      <Sparkles className="w-6 h-6 text-primary animate-pulse" />
                    </div>
                    <p className="text-base text-foreground/80 max-w-lg mx-auto">
                      Turn your entry into a beautiful shareable image for Instagram, Stories, or Messages
                    </p>
                  </div>
                  <Button 
                    onClick={() => setShowShareableCard(true)}
                    size="lg"
                    className="gap-2 text-lg px-8 py-6 shadow-xl hover:scale-105 transition-transform"
                  >
                    <Share2 className="w-5 h-5" />
                    Create Shareable Card
                  </Button>
                </div>
              </Card>
            </div>
          )}

          {/* Today's Insight */}
          {entries.length >= 1 && (
            <div className="animate-fade-up" style={{ animationDelay: "0.1s", animationFillMode: "both" }}>
              <LifeInsight userId={user.id} entriesCount={entries.length} />
            </div>
          )}

          {/* Memory Resurfacing */}
          {entries.length >= 5 && (
            <div className="animate-fade-up" style={{ animationDelay: "0.12s", animationFillMode: "both" }}>
              <MemoryResurfacing userId={user.id} />
            </div>
          )}

          {/* Journey Summary */}
          {entries.length >= 3 && (
            <div className="animate-fade-up" style={{ animationDelay: "0.15s", animationFillMode: "both" }}>
              <JourneySummary totalEntries={entries.length} onViewStats={() => navigate("/stats")} />
            </div>
          )}

          {/* Saved Moments - Entry History */}
          <EntryHistory entries={entries} onUpdate={fetchEntries} />

          {/* Social Share - Bottom */}
          {todayEntry && (
            <div className="animate-fade-up" style={{ animationDelay: "0.2s", animationFillMode: "both" }}>
              <SocialShare 
                streak={streak} 
                todayEntry={todayEntry.entry_text}
                todayMood={todayEntry.mood_score || 3}
              />
            </div>
          )}
        </div>
      </div>

      {/* Shareable Card Dialog */}
      <Dialog open={showShareableCard} onOpenChange={setShowShareableCard}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Your Shareable Moment
            </DialogTitle>
          </DialogHeader>
          {todayEntry && (
            <ShareableReflectionCard
              entryText={todayEntry.entry_text}
              date={todayEntry.entry_date}
              mood={todayEntry.mood_score}
              onClose={() => setShowShareableCard(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;