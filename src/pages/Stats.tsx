import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Loader2, TrendingUp, Calendar, Zap, Smile, Sparkles } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, subMonths, differenceInDays, parseISO, subDays } from "date-fns";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface JournalEntry {
  id: string;
  entry_date: string;
  mood_score: number | null;
  entry_text: string;
  ai_reflection: string | null;
}

const Stats = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [totalDays, setTotalDays] = useState(0);
  const [timeRange, setTimeRange] = useState<7 | 30 | 60 | 90>(30);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);

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
    const today = new Date();
    const startDate = subDays(today, timeRange - 1);
    const days = eachDayOfInterval({ start: startDate, end: today });

    return days.map(day => {
      const entry = entries.find(e => {
        const entryDate = parseISO(e.entry_date);
        return isSameDay(entryDate, day);
      });
      return {
        date: day,
        hasEntry: !!entry,
        moodScore: entry?.mood_score || null,
        entry: entry || null
      };
    });
  };

  const getMoodChartData = () => {
    const today = new Date();
    const daysToShow = Math.min(timeRange, 30); // Show max 30 days on chart for readability
    
    const chartData = Array.from({ length: daysToShow }, (_, i) => {
      const date = subDays(today, daysToShow - 1 - i);
      const entry = entries.find(e => {
        const entryDate = parseISO(e.entry_date);
        return isSameDay(entryDate, date);
      });
      
      return {
        date: format(date, 'MMM d'),
        mood: entry?.mood_score || null,
        hasEntry: !!entry
      };
    });
    
    return chartData;
  };

  const getMoodIntensityColor = (score: number | null) => {
    if (score === null) return "bg-muted";
    
    // Map mood scores (1-5) to color intensities
    if (score === 1) return "bg-destructive/40";
    if (score === 2) return "bg-primary/30";
    if (score === 3) return "bg-primary/50";
    if (score === 4) return "bg-primary/70";
    return "bg-primary";
  };

  const getTimeRangeLabel = () => {
    if (timeRange === 7) return "Last 7 Days";
    if (timeRange === 30) return "Last Month";
    if (timeRange === 60) return "Last 2 Months";
    return "Last 3 Months";
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

          {/* Time Range Filters */}
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Time Range:</span>
              <div className="flex gap-2">
                {[
                  { value: 7, label: "7D" },
                  { value: 30, label: "1M" },
                  { value: 60, label: "2M" },
                  { value: 90, label: "3M" }
                ].map(option => (
                  <Button
                    key={option.value}
                    variant={timeRange === option.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTimeRange(option.value as 7 | 30 | 60 | 90)}
                    className="min-w-[60px]"
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>
          </Card>

          {/* Mood Trend Chart */}
          {entries.length > 0 && (
            <Card className="p-6">
              <h3 className="text-xl font-semibold text-foreground mb-6">
                Mood Journey {timeRange <= 30 ? `(Last ${timeRange} Days)` : `(Last ${Math.min(timeRange, 30)} Days)`}
              </h3>
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
            <p className="text-sm text-muted-foreground mb-4">{getTimeRangeLabel()} - Click any date to view entry</p>
            <div className={`grid gap-2 ${timeRange === 7 ? 'grid-cols-7' : 'grid-cols-7'}`}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-xs text-center text-muted-foreground font-medium mb-1">
                  {day}
                </div>
              ))}
              {heatmapData.map((day, idx) => {
                const isToday = isSameDay(day.date, new Date());
                const moodEmoji = day.moodScore === 1 ? "😢" : day.moodScore === 2 ? "😕" : day.moodScore === 3 ? "🙂" : day.moodScore === 4 ? "😌" : day.moodScore === 5 ? "😄" : "";
                const dateFormatted = format(day.date, 'MM/dd/yyyy');
                const tooltipText = day.entry 
                  ? `${dateFormatted}\n${day.entry.entry_text}\nMood: ${moodEmoji}`
                  : `${dateFormatted}\nNo entry`;
                
                return (
                  <button
                    key={`${day.date.toISOString()}-${idx}`}
                    onClick={() => day.entry && setSelectedEntry(day.entry)}
                    disabled={!day.hasEntry}
                    className={`aspect-square rounded-lg transition-all hover:scale-110 hover:shadow-lg flex flex-col items-center justify-center gap-0.5 p-1 ${
                      getMoodIntensityColor(day.moodScore)
                    } ${isToday ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}
                    ${day.hasEntry ? 'cursor-pointer' : 'cursor-default'}`}
                    title={tooltipText}
                  >
                    <span className={`text-[8px] font-semibold ${day.hasEntry ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {format(day.date, 'M/d')}
                    </span>
                    {day.hasEntry && moodEmoji && (
                      <span className="text-xs leading-none">{moodEmoji}</span>
                    )}
                  </button>
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

        {/* Entry Detail Dialog */}
        <Dialog open={!!selectedEntry} onOpenChange={() => setSelectedEntry(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <Calendar className="w-5 h-5 text-primary" />
                {selectedEntry && format(parseISO(selectedEntry.entry_date), 'MMMM d, yyyy')}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <p className="text-lg text-foreground font-medium">
                  {selectedEntry?.entry_text}
                </p>
              </div>

              {selectedEntry?.mood_score && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Mood:</span>
                  <span className="text-2xl">
                    {selectedEntry.mood_score === 1 ? "😢" : 
                     selectedEntry.mood_score === 2 ? "😕" : 
                     selectedEntry.mood_score === 3 ? "🙂" : 
                     selectedEntry.mood_score === 4 ? "😌" : "😄"}
                  </span>
                  <span className="font-medium text-foreground">
                    {selectedEntry.mood_score === 1 ? "Rough" : 
                     selectedEntry.mood_score === 2 ? "Meh" : 
                     selectedEntry.mood_score === 3 ? "Okay" : 
                     selectedEntry.mood_score === 4 ? "Good" : "Great"}
                  </span>
                </div>
              )}

              {selectedEntry?.ai_reflection && (
                <div className="pt-4 border-t border-border">
                  <div className="flex items-start gap-3">
                    <Sparkles className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
                    <div>
                      <p className="text-sm font-medium text-foreground mb-2">AI Reflection</p>
                      <p className="text-sm text-muted-foreground italic">
                        {selectedEntry.ai_reflection}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Stats;
