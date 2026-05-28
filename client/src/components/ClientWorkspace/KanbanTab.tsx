import { Button } from "@/components/ui/button";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useCallback, useEffect } from "react";
import {
  WorkspacePostStatus,
  useBatchUpdateWorkspacePosts,
  useClientKanban,
} from "@/hooks/use-client-workspace";
import { KanbanColumn } from "./KanbanColumn";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PostDetailModal } from "@/components/library/PostDetailModal";
import type { LibraryPostItem } from "@/hooks/use-posts-library";
import { useToast } from "@/hooks/use-toast";

interface KanbanTabProps {
  clientId: string;
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

const STAGE_TAG_BY_STATUS: Record<WorkspacePostStatus, string> = {
  draft: "brief",
  in_production: "production",
  needs_adjustment: "adjustment",
  ready_review: "review",
  in_approval: "approval",
  approved: "approved",
  scheduled: "scheduled",
  published: "published",
  rejected: "rejected",
};

const ALLOWED_TRANSITIONS: Record<WorkspacePostStatus, WorkspacePostStatus[]> = {
  draft: ["in_production", "in_approval"],
  in_production: ["needs_adjustment", "in_approval", "draft"],
  needs_adjustment: ["in_production", "in_approval", "draft"],
  ready_review: ["approved", "draft", "needs_adjustment", "in_approval"],
  in_approval: ["approved", "needs_adjustment", "draft"],
  approved: ["scheduled", "published", "ready_review", "in_approval"],
  scheduled: ["published", "in_approval", "needs_adjustment"],
  published: [],
  rejected: ["draft", "in_production"],
};

export function KanbanTab({ clientId }: KanbanTabProps) {
  const { data, isLoading } = useClientKanban(clientId);
  const batchUpdate = useBatchUpdateWorkspacePosts(clientId);
  const { toast } = useToast();
  const [draggedItem, setDraggedItem] = useState<{ id: string; status: WorkspacePostStatus } | null>(null);
  const [collapsedColumns, setCollapsedColumns] = useState<Set<string>>(new Set());
  const [mobileColumnIndex, setMobileColumnIndex] = useState(0);
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [selectedPost, setSelectedPost] = useState<LibraryPostItem | null>(null);

  const columns = data?.columns || [];
  const availableTags = Array.from(
    new Set(
      columns
        .flatMap((column) => column.items || [])
        .flatMap((item) => item.tags || [])
        .map((tag) => String(tag).trim())
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b, "pt-BR"));

  const filteredColumns = columns.map((column) => ({
    ...column,
    items: (column.items || []).filter((item) => {
      if (!tagFilter || tagFilter === "all") return true;
      return Boolean(item.tags?.includes(tagFilter));
    }),
  }));

  useEffect(() => {
    setMobileColumnIndex((prev) => {
      if (filteredColumns.length === 0) return 0;
      return Math.min(prev, filteredColumns.length - 1);
    });
  }, [filteredColumns.length]);

  const toggleCollapse = useCallback((columnId: string) => {
    setCollapsedColumns((prev) => {
      const next = new Set(prev);
      if (next.has(columnId)) {
        next.delete(columnId);
      } else {
        next.add(columnId);
      }
      return next;
    });
  }, []);

  const moveToNext = (postId: string, status: WorkspacePostStatus) => {
    const next = NEXT_STATUS[status];
    if (!next) return;

    batchUpdate.mutate({
      post_ids: [postId],
      status: next,
      stage_tag: STAGE_TAG_BY_STATUS[next],
    });
  };

  const moveToColumn = (targetStatus: WorkspacePostStatus) => {
    if (!draggedItem) return;
    if (draggedItem.status === targetStatus) return;

    const allowedTargets = ALLOWED_TRANSITIONS[draggedItem.status] || [];
    if (!allowedTargets.includes(targetStatus)) {
      toast({
        title: "Movimento indisponível",
        description: "Esse card só pode avançar pelos fluxos permitidos.",
      });
      return;
    }

    batchUpdate.mutate({
      post_ids: [draggedItem.id],
      status: targetStatus,
      stage_tag: STAGE_TAG_BY_STATUS[targetStatus],
    });
  };

  const handleAddNew = (columnId: WorkspacePostStatus) => {
    // Navigate to create post page with pre-selected status
    window.location.href = `/creatives/new?client_id=${clientId}&status=${columnId}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-display font-bold">Kanban de Conteúdos</h2>
          <p className="text-sm text-muted-foreground">Acompanhe as etapas de produção por status</p>
        </div>
        {availableTags.length > 0 && (
          <div className="w-[220px]">
            <Select value={tagFilter} onValueChange={setTagFilter}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Filtrar por tag" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as tags</SelectItem>
                {availableTags.map((tag) => (
                  <SelectItem key={tag} value={tag}>
                    {tag}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Mobile column navigation */}
      <div className="flex md:hidden items-center justify-between gap-2 px-1">
        <Button
          variant="outline"
          size="sm"
          disabled={mobileColumnIndex <= 0}
          onClick={() => setMobileColumnIndex((i) => Math.max(0, i - 1))}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="text-sm font-medium">
          {filteredColumns[mobileColumnIndex]?.label || ""}
          <span className="text-muted-foreground ml-1">
            ({mobileColumnIndex + 1}/{filteredColumns.length})
          </span>
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={mobileColumnIndex >= filteredColumns.length - 1}
          onClick={() => setMobileColumnIndex((i) => Math.min(filteredColumns.length - 1, i + 1))}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Horizontal scroll kanban */}
      <div className="overflow-x-auto pb-2 -mx-2 px-2">
        <div className="flex gap-3 min-w-max">
          {filteredColumns.map((column, index) => (
            <KanbanColumn
              key={column.id}
              id={column.id as WorkspacePostStatus}
              label={column.label}
              items={column.items}
              draggedItemId={draggedItem?.id || null}
              isCollapsed={collapsedColumns.has(column.id)}
              onToggleCollapse={() => toggleCollapse(column.id)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => moveToColumn(column.id as WorkspacePostStatus)}
              onDragStart={(id, status) => setDraggedItem({ id, status })}
              onDragEnd={() => setDraggedItem(null)}
              onMoveNext={moveToNext}
              isPending={batchUpdate.isPending}
              onAddNew={() => handleAddNew(column.id as WorkspacePostStatus)}
              isMobileActive={index === mobileColumnIndex}
              onPostClick={(item) => setSelectedPost(item as LibraryPostItem)}
            />
          ))}
        </div>
      </div>

      <PostDetailModal
        post={selectedPost}
        open={!!selectedPost}
        onOpenChange={(open) => {
          if (!open) setSelectedPost(null);
        }}
      />
    </div>
  );
}
