import { Progress } from "@/components/ui/progress";
import { resolveStageLabel } from "@/lib/stage-labels";

interface GenerationProgressProps {
  active: boolean;
  stage?: string;
  progress?: number;
}

export function GenerationProgress({ active, stage, progress }: GenerationProgressProps) {
  if (!active) return null;

  const value = Math.max(5, Math.min(100, progress ?? 10));

  return (
    <div className="rounded-lg border border-border/50 bg-secondary/20 p-4 space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-foreground">{resolveStageLabel(stage)}</span>
        <span className="text-muted-foreground">{value}%</span>
      </div>
      <Progress value={value} className="h-2" />
    </div>
  );
}
