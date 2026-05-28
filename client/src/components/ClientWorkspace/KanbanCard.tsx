import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WorkspacePostItem, WorkspacePostStatus } from "@/hooks/use-client-workspace";
import { cn } from "@/lib/utils";
import { Image, Video, Type, FileText, Layers, Calendar, ChevronRight } from "lucide-react";

interface Props {
  item: WorkspacePostItem;
  onDragStart: () => void;
  onDragEnd: () => void;
  onMoveNext?: () => void;
  isPending?: boolean;
  onClick?: () => void;
}

const FORMAT_ICONS: Record<string, React.ReactNode> = {
  carousel: <Layers className="w-3 h-3" />,
  reels: <Video className="w-3 h-3" />,
  static: <Image className="w-3 h-3" />,
  story: <FileText className="w-3 h-3" />,
  text: <Type className="w-3 h-3" />,
};

const FORMAT_LABELS: Record<string, string> = {
  carousel: "Carrossel",
  reels: "Reels",
  static: "Estático",
  story: "Story",
  text: "Texto",
};

function getColorBorderClass(colorLabel: string | null | undefined): string {
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

const NEXT_STATUS: Partial<Record<WorkspacePostStatus, WorkspacePostStatus>> = {
  draft: "in_production",
  in_production: "needs_adjustment",
  needs_adjustment: "in_approval",
  ready_review: "approved",
  in_approval: "approved",
  approved: "scheduled",
  scheduled: "published",
};

export function KanbanCard({ item, onDragStart, onDragEnd, onMoveNext, isPending, onClick }: Props) {
  const formatType = item.format_type || "carousel";
  const colorBorder = getColorBorderClass(item.color_label);
  const next = NEXT_STATUS[item.status];

  return (
    <div
      className={cn(
        "rounded-md border border-border/60 p-3 space-y-2 cursor-grab active:cursor-grabbing border-l-4 bg-card transition-shadow hover:shadow-md",
        colorBorder
      )}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
    >
      <p className="text-sm font-medium line-clamp-2">{item.title || "Conteúdo sem título"}</p>
      <div className="flex items-center gap-1.5 flex-wrap">
        <Badge variant="outline" className="gap-1 text-[10px] font-normal px-1 py-0">
          {FORMAT_ICONS[formatType] || FORMAT_ICONS.carousel}
          {FORMAT_LABELS[formatType] || "Carrossel"}
        </Badge>
        {item.tags && item.tags.length > 0 && (
          <div className="flex gap-1">
            {item.tags.slice(0, 2).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-[9px] px-1 py-0">
                {tag}
              </Badge>
            ))}
            {item.tags.length > 2 && (
              <Badge variant="secondary" className="text-[9px] px-1 py-0">
                +{item.tags.length - 2}
              </Badge>
            )}
          </div>
        )}
      </div>
      {item.scheduled_for && (
        <div className="flex items-center gap-1 text-[10px] text-cyan-300">
          <Calendar className="w-3 h-3" />
          {new Date(item.scheduled_for).toLocaleString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      )}
      <p className="text-xs text-muted-foreground">Tag: {item.stage_tag || "-"}</p>
      {next && onMoveNext && (
        <Button
          size="sm"
          variant="outline"
          className="w-full text-xs"
          disabled={isPending}
          onClick={onMoveNext}
        >
          Avançar
          <ChevronRight className="w-3 h-3 ml-1" />
        </Button>
      )}
    </div>
  );
}
