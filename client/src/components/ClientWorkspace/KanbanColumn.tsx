import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WorkspacePostItem, WorkspacePostStatus } from "@/hooks/use-client-workspace";
import { KanbanCard } from "./KanbanCard";
import { Plus, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  id: WorkspacePostStatus;
  label: string;
  items: WorkspacePostItem[];
  draggedItemId: string | null;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
  onDragStart: (id: string, status: WorkspacePostStatus) => void;
  onDragEnd: () => void;
  onMoveNext: (postId: string, status: WorkspacePostStatus) => void;
  isPending: boolean;
  onAddNew: () => void;
  isMobileActive?: boolean;
  onPostClick?: (item: WorkspacePostItem) => void;
}

export function KanbanColumn({
  id,
  label,
  items,
  isCollapsed,
  onToggleCollapse,
  onDragOver,
  onDrop,
  onDragStart,
  onDragEnd,
  onMoveNext,
  isPending,
  onAddNew,
  isMobileActive,
  onPostClick,
}: Props) {
  return (
    <div
      className={cn(
        "flex-shrink-0 w-[280px] flex flex-col rounded-lg border border-border bg-muted/30 transition-all",
        isMobileActive === false && "hidden md:flex",
        isMobileActive === true && "flex md:flex"
      )}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2.5 border-b border-border cursor-pointer select-none"
        onClick={onToggleCollapse}
      >
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">{label}</h3>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
            {items.length}
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              onAddNew();
            }}
          >
            <Plus className="w-3.5 h-3.5" />
          </Button>
          {isCollapsed ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Content */}
      {!isCollapsed && (
        <div className="flex-1 p-2 space-y-2 overflow-y-auto min-h-[80px] max-h-[calc(100vh-280px)]">
          {items.length === 0 ? (
            <div className="text-xs text-muted-foreground rounded-md border border-dashed p-3 text-center">
              Nenhum conteúdo nesta coluna.
            </div>
          ) : (
            items.map((item) => (
              <KanbanCard
                key={item.id}
                item={item}
                onDragStart={() => onDragStart(item.id, item.status)}
                onDragEnd={onDragEnd}
                onMoveNext={() => onMoveNext(item.id, item.status)}
                isPending={isPending}
                onClick={() => onPostClick?.(item)}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
