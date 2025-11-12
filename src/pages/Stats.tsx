import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Loader2, TrendingUp, Calendar, Zap, Smile } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, subMonths, differenceInDays, parseISO, subDays } from "date-fns";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";

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

  const getMoodChartData = () => {
    // Get last 30 days of data
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = subDays(new Date(), 29 - i);
      const entry = entries.find(e => isSameDay(parseISO(e.entry_date), date));
      
      return {
        date: format(date, 'MMM d'),
        mood: entry?.mood_score || null,
        hasEntry: !!entry
      };
    });
    
    return last30Days;
  };

  const getMoodIntensityColor = (score: number | null) => {
    if (!score) return "bg-muted";
    
    // Map mood scores (1-5) to color intensities
    if (score === 1) return "bg-destructive/40";
    if (score === 2) return "bg-primary/30";
    if (score === 3) return "bg-primary/50";
    if (score === 4) return "bg-primary/70";
    return "bg-primary";
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-accent/20 to-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const heatmapData = getHeatmapData();
  const moodChartData = getMoodChartData();
  const avgMood = entries.filter(e => e.mood_score).length > 0
    ? (entries.reduce((sum, e) => sum + (e.mood_score || 0), 0) / entries.filter(e => e.mood_score).length).toFixed(1)
    : "N/A";

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

          {/* Average Mood */}
          <Card className="p-6 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
            <div className="flex items-center gap-3 mb-2">
              <Smile className="w-5 h-5 text-primary" />
              <h3 className="text-sm font-medium text-muted-foreground">Average Mood</h3>
            </div>
            <p className="text-3xl font-bold text-foreground">{avgMood}</p>
            <p className="text-sm text-muted-foreground mt-1">out of 5</p>
          </Card>

          {/* Mood Trend Chart */}
          {entries.length > 0 && (
            <Card className="p-6">
              <h3 className="text-xl font-semibold text-foreground mb-6">Mood Journey (Last 30 Days)</h3>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={moodChartData}>
                  <defs>
                    <linearGradient id="moodGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="date" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis 
                    domain={[0, 5]} 
                    ticks={[1, 2, 3, 4, 5]}
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      padding: '8px 12px'
                    }}
                    formatter={(value: any) => value ? [`${value}/5`, 'Mood'] : ['No entry', '']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="mood" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    fill="url(#moodGradient)"
                    connectNulls
                  />
                </AreaChart>
              </ResponsiveContainer>
              <p className="text-xs text-muted-foreground text-center mt-4">
                Track your emotional patterns over time
              </p>
            </Card>
          )}

          {/* Activity Heatmap */}
          <Card className="p-6">
            <h3 className="text-xl font-semibold text-foreground mb-4">Activity & Mood Intensity</h3>
            <p className="text-sm text-muted-foreground mb-4">Last 3 months of journaling</p>
            <div className="grid grid-cols-7 gap-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-xs text-center text-muted-foreground font-medium">
                  {day}
                </div>
              ))}
              {heatmapData.map((day, idx) => {
                const isToday = isSameDay(day.date, new Date());
                const moodEmoji = day.moodScore === 1 ? "😢" : day.moodScore === 2 ? "😕" : day.moodScore === 3 ? "🙂" : day.moodScore === 4 ? "😌" : day.moodScore === 5 ? "😄" : "";
                return (
                  <div
                    key={idx}
                    className={`aspect-square rounded-sm transition-all hover:scale-110 ${
                      getMoodIntensityColor(day.moodScore)
                    } ${isToday ? 'ring-2 ring-primary ring-offset-2' : ''}`}
                    title={`${format(day.date, 'MMM d')}: ${day.hasEntry ? `Mood ${day.moodScore}/5 ${moodEmoji}` : 'No entry'}`}
                  />
                );
              })}
            </div>
            <div className="flex items-center justify-between mt-6">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Mood Scale:</span>
                <div className="flex gap-1 items-center">
                  <div className="w-3 h-3 rounded-sm bg-destructive/40" title="1 - Rough" />
                  <div className="w-3 h-3 rounded-sm bg-primary/30" title="2 - Meh" />
                  <div className="w-3 h-3 rounded-sm bg-primary/50" title="3 - Okay" />
                  <div className="w-3 h-3 rounded-sm bg-primary/70" title="4 - Good" />
                  <div className="w-3 h-3 rounded-sm bg-primary" title="5 - Great" />
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                <span className="inline-block w-3 h-3 rounded-sm bg-muted mr-1 align-middle" />
                No entry
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Stats;
