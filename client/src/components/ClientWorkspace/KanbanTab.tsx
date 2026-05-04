import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import {
  WorkspacePostStatus,
  useBatchUpdateWorkspacePosts,
  useClientKanban,
} from "@/hooks/use-client-workspace";

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

export function KanbanTab({ clientId }: KanbanTabProps) {
  const { data, isLoading } = useClientKanban(clientId);
  const batchUpdate = useBatchUpdateWorkspacePosts(clientId);
  const [draggedItem, setDraggedItem] = useState<{ id: string; status: WorkspacePostStatus } | null>(null);

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

    batchUpdate.mutate({
      post_ids: [draggedItem.id],
      status: targetStatus,
      stage_tag: STAGE_TAG_BY_STATUS[targetStatus],
    });
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
      <div>
        <h2 className="text-xl font-display font-bold">Kanban de Conteúdos</h2>
        <p className="text-sm text-muted-foreground">Acompanhe as etapas de produção por status</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {(data?.columns || []).map((column) => (
          <Card
            key={column.id}
            className="h-full"
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => moveToColumn(column.id as WorkspacePostStatus)}
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center justify-between">
                {column.label}
                <Badge variant="secondary">{column.items.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {column.items.length === 0 ? (
                <div className="text-xs text-muted-foreground rounded-md border border-dashed p-3">
                  Nenhum conteúdo nesta coluna.
                </div>
              ) : (
                column.items.map((item) => {
                  const next = NEXT_STATUS[item.status];
                  return (
                    <div
                      key={item.id}
                      className="rounded-md border border-border/60 p-3 space-y-2 cursor-grab active:cursor-grabbing"
                      draggable
                      onDragStart={() => setDraggedItem({ id: item.id, status: item.status })}
                      onDragEnd={() => setDraggedItem(null)}
                    >
                      <p className="text-sm font-medium line-clamp-2">{item.title || "Conteúdo sem título"}</p>
                      <p className="text-xs text-muted-foreground">Tag: {item.stage_tag || "-"}</p>
                      {next ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full"
                          disabled={batchUpdate.isPending}
                          onClick={() => moveToNext(item.id, item.status)}
                        >
                          Avançar para {next}
                        </Button>
                      ) : null}
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
