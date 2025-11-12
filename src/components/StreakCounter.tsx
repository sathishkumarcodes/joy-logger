import { Card } from "@/components/ui/card";
import { Flame } from "lucide-react";

interface StreakCounterProps {
  streak: number;
}

export const StreakCounter = ({ streak }: StreakCounterProps) => {
  return (
    <Card className="p-6 bg-gradient-to-br from-primary to-primary-glow text-primary-foreground shadow-glow">
      <div className="flex items-center justify-center gap-3">
        <Flame className="w-8 h-8 animate-pulse" />
        <div className="text-center">
          <div className="text-4xl font-bold">{streak}</div>
          <div className="text-sm opacity-90">Day Streak</div>
        </div>
      </div>
    </Card>
  );
};