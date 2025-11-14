import { Card } from "@/components/ui/card";
import { Sun } from "lucide-react";
import { MilestoneBadge } from "./MilestoneBadge";

interface StreakCounterProps {
  streak: number;
}

export const StreakCounter = ({ streak }: StreakCounterProps) => {
  return (
    <Card className="p-8 bg-gradient-to-br from-amber-50/80 to-orange-50/60 border-0 shadow-soft animate-fade-up">
      <div className="flex flex-col items-center gap-4">
        <Sun className="w-12 h-12 text-primary animate-float" strokeWidth={2.5} />
        <div className="text-center space-y-1">
          <div className="text-5xl font-bold text-foreground">{streak} {streak === 1 ? 'day' : 'days'}</div>
          <div className="text-lg text-muted-foreground font-medium">Your daily joy streak</div>
          <div className="text-sm text-muted-foreground/80">You're building a powerful habit.</div>
        </div>
        <MilestoneBadge streak={streak} animate={true} />
      </div>
    </Card>
  );
};