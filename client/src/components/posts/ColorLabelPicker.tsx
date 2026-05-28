import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type ColorOption = { value: string; label: string; class: string };

const COLOR_OPTIONS: ColorOption[] = [
  { value: "", label: "Sem cor", class: "bg-transparent border-border" },
  { value: "red", label: "Vermelho", class: "bg-red-500 border-red-500" },
  { value: "yellow", label: "Amarelo", class: "bg-yellow-500 border-yellow-500" },
  { value: "green", label: "Verde", class: "bg-green-500 border-green-500" },
  { value: "blue", label: "Azul", class: "bg-blue-500 border-blue-500" },
  { value: "purple", label: "Roxo", class: "bg-purple-500 border-purple-500" },
  { value: "pink", label: "Rosa", class: "bg-pink-500 border-pink-500" },
];

interface ColorLabelPickerProps {
  value: string | null | undefined;
  onChange: (value: string) => void;
  size?: "sm" | "md";
}

export function ColorLabelPicker({ value, onChange, size = "sm" }: ColorLabelPickerProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex items-center gap-1">
        {COLOR_OPTIONS.map((color) => (
          <Tooltip key={color.value}>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => onChange(color.value)}
                className={cn(
                  "rounded-full border-2 transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring",
                  size === "sm" ? "w-4 h-4" : "w-6 h-6",
                  color.class,
                  value === color.value || (!value && !color.value)
                    ? "ring-2 ring-offset-1 ring-foreground scale-110"
                    : "opacity-60 hover:opacity-100"
                )}
                aria-label={color.label}
              />
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <span className="text-xs">{color.label}</span>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}

export function getColorBorderClass(colorLabel: string | null | undefined): string {
  switch (colorLabel) {
    case "red": return "border-l-red-500";
    case "yellow": return "border-l-yellow-500";
    case "green": return "border-l-green-500";
    case "blue": return "border-l-blue-500";
    case "purple": return "border-l-purple-500";
    case "pink": return "border-l-pink-500";
    default: return "border-l-transparent";
  }
}
