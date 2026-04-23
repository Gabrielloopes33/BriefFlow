import { Button } from "@/components/ui/button";

interface QuickActionChipsProps {
  onSelect: (value: string) => void;
}

const QUICK_ACTIONS = [
  "Post educativo",
  "Case de sucesso",
  "Carrossel de dicas",
  "Citação impactante",
];

export function QuickActionChips({ onSelect }: QuickActionChipsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {QUICK_ACTIONS.map((action) => (
        <Button
          key={action}
          type="button"
          variant="outline"
          size="sm"
          className="bg-secondary/30 border-border/50 hover:bg-secondary/60"
          onClick={() => onSelect(action)}
        >
          {action}
        </Button>
      ))}
    </div>
  );
}
