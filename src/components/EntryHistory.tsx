import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar, Sparkles } from "lucide-react";
import { format } from "date-fns";

interface Entry {
  id: string;
  entry_date: string;
  entry_text: string;
  ai_reflection: string | null;
  created_at: string;
}

interface EntryHistoryProps {
  entries: Entry[];
}

export const EntryHistory = ({ entries }: EntryHistoryProps) => {
  if (entries.length === 0) {
    return (
      <Card className="p-8 text-center bg-muted/30">
        <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold text-foreground mb-2">No entries yet</h3>
        <p className="text-muted-foreground">Start your journey today!</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-foreground">Your Journey</h2>
      <ScrollArea className="h-[600px] pr-4">
        <div className="space-y-4">
          {entries.map((entry) => (
            <Card
              key={entry.id}
              className="p-6 bg-card hover:shadow-soft transition-all"
            >
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  {format(new Date(entry.entry_date), "MMMM d, yyyy")}
                </div>
                
                <p className="text-lg text-foreground font-medium">
                  {entry.entry_text}
                </p>

                {entry.ai_reflection && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <div className="flex items-start gap-2">
                      <Sparkles className="w-4 h-4 text-primary flex-shrink-0 mt-1" />
                      <p className="text-sm text-muted-foreground italic">
                        {entry.ai_reflection}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};