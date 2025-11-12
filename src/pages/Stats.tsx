import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Loader2, TrendingUp, Calendar, Zap } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, subMonths, differenceInDays, parseISO } from "date-fns";

interface JournalEntry {
  id: string;
  entry_date: string;
  mood_score: number | null;
  entry_text: string;
}

const Stats = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [totalDays, setTotalDays] = useState(0);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    } else if (user) {
      loadEntries();
    }
  }, [user, authLoading, navigate]);

  const loadEntries = async () => {
    try {
      const { data, error } = await supabase
        .from("journal_entries")
        .select("*")
        .eq("user_id", user?.id)
        .order("entry_date", { ascending: true });

      if (error) throw error;

      setEntries(data || []);
      calculateStats(data || []);
    } catch (error) {
      console.error("Error loading entries:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (entries: JournalEntry[]) => {
    if (entries.length === 0) return;

    setTotalDays(entries.length);

    // Calculate streaks
    const dates = entries.map(e => e.entry_date).sort();
    let current = 0;
    let longest = 0;
    let temp = 1;

    const today = format(new Date(), "yyyy-MM-dd");
    const yesterday = format(new Date(Date.now() - 86400000), "yyyy-MM-dd");

    // Check if last entry is today or yesterday for current streak
    const lastEntry = dates[dates.length - 1];
    if (lastEntry === today || lastEntry === yesterday) {
      current = 1;
      
      for (let i = dates.length - 2; i >= 0; i--) {
        const prevDate = new Date(dates[i]);
        const currDate = new Date(dates[i + 1]);
        const diff = differenceInDays(currDate, prevDate);
        
        if (diff === 1) {
          current++;
        } else {
          break;
        }
      }
    }

    // Calculate longest streak
    for (let i = 1; i < dates.length; i++) {
      const prevDate = new Date(dates[i - 1]);
      const currDate = new Date(dates[i]);
      const diff = differenceInDays(currDate, prevDate);
      
      if (diff === 1) {
        temp++;
      } else {
        longest = Math.max(longest, temp);
        temp = 1;
      }
    }
    longest = Math.max(longest, temp);

    setCurrentStreak(current);
    setLongestStreak(longest);
  };

  const getHeatmapData = () => {
    const start = startOfMonth(subMonths(new Date(), 2));
    const end = endOfMonth(new Date());
    const days = eachDayOfInterval({ start, end });

    return days.map(day => {
      const entry = entries.find(e => 
        isSameDay(parseISO(e.entry_date), day)
      );
      return {
        date: day,
        hasEntry: !!entry,
        moodScore: entry?.mood_score || 0
      };
    });
  };

  const getMoodSparkline = () => {
    return entries
      .slice(-30)
      .map(e => e.mood_score || 5);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-accent/20 to-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const heatmapData = getHeatmapData();
  const moodData = getMoodSparkline();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/20 to-background">
      <div className="container max-w-4xl mx-auto px-4 py-12">
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-3xl font-bold text-foreground">Your Stats</h1>
          </div>

          {/* Key Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <Zap className="w-5 h-5 text-primary" />
                <h3 className="text-sm font-medium text-muted-foreground">Current Streak</h3>
              </div>
              <p className="text-3xl font-bold text-foreground">{currentStreak}</p>
              <p className="text-sm text-muted-foreground mt-1">days in a row</p>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                <h3 className="text-sm font-medium text-muted-foreground">Longest Streak</h3>
              </div>
              <p className="text-3xl font-bold text-foreground">{longestStreak}</p>
              <p className="text-sm text-muted-foreground mt-1">personal best</p>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <Calendar className="w-5 h-5 text-primary" />
                <h3 className="text-sm font-medium text-muted-foreground">Total Days</h3>
              </div>
              <p className="text-3xl font-bold text-foreground">{totalDays}</p>
              <p className="text-sm text-muted-foreground mt-1">entries logged</p>
            </Card>
          </div>

          {/* Heatmap Calendar */}
          <Card className="p-6">
            <h3 className="text-xl font-semibold text-foreground mb-4">Activity Heatmap</h3>
            <div className="grid grid-cols-7 gap-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-xs text-center text-muted-foreground font-medium">
                  {day}
                </div>
              ))}
              {heatmapData.map((day, idx) => {
                const isToday = isSameDay(day.date, new Date());
                return (
                  <div
                    key={idx}
                    className={`aspect-square rounded-sm transition-colors ${
                      day.hasEntry
                        ? 'bg-primary hover:bg-primary/80'
                        : 'bg-muted hover:bg-muted/80'
                    } ${isToday ? 'ring-2 ring-primary ring-offset-2' : ''}`}
                    title={`${format(day.date, 'MMM d')}: ${day.hasEntry ? 'Entry logged' : 'No entry'}`}
                  />
                );
              })}
            </div>
            <div className="flex items-center justify-end gap-2 mt-4 text-xs text-muted-foreground">
              <span>Less</span>
              <div className="flex gap-1">
                <div className="w-3 h-3 rounded-sm bg-muted" />
                <div className="w-3 h-3 rounded-sm bg-primary/40" />
                <div className="w-3 h-3 rounded-sm bg-primary/70" />
                <div className="w-3 h-3 rounded-sm bg-primary" />
              </div>
              <span>More</span>
            </div>
          </Card>

          {/* Mood Sparkline */}
          {moodData.length > 0 && (
            <Card className="p-6">
              <h3 className="text-xl font-semibold text-foreground mb-4">Mood Trend (Last 30 Days)</h3>
              <div className="h-32 flex items-end gap-1">
                {moodData.map((score, idx) => {
                  const height = (score / 10) * 100;
                  return (
                    <div
                      key={idx}
                      className="flex-1 bg-primary rounded-t transition-all hover:bg-primary/80"
                      style={{ height: `${height}%`, minHeight: '4px' }}
                      title={`Mood: ${score}/10`}
                    />
                  );
                })}
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                <span>30 days ago</span>
                <span>Today</span>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Stats;
