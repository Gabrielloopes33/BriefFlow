import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPatch, apiPost } from "@/lib/api";

export type WorkspacePostStatus =
  | "draft"
  | "in_production"
  | "needs_adjustment"
  | "ready_review"
  | "in_approval"
  | "approved"
  | "scheduled"
  | "published"
  | "rejected";

export interface WorkspacePostItem {
  id: string;
  client_id: string;
  title: string | null;
  content: string | null;
  status: WorkspacePostStatus;
  generated_by: string | null;
  scheduled_for: string | null;
  stage_tag: string | null;
  kanban_order: number | null;
  created_at: string;
  updated_at: string;
}

interface CalendarResponse {
  view: "week" | "month";
  from: string;
  to: string;
  items: WorkspacePostItem[];
  buckets: Record<string, WorkspacePostItem[]>;
}

interface KanbanColumn {
  id: WorkspacePostStatus;
  label: string;
  items: WorkspacePostItem[];
}

interface KanbanResponse {
  columns: KanbanColumn[];
  total: number;
}

export function useClientPostsList(clientId: string) {
  return useQuery({
    queryKey: ["client-posts-list", clientId],
    queryFn: () => apiGet<WorkspacePostItem[]>(`/api/clients/${clientId}/posts/list`),
    enabled: !!clientId,
  });
}

export interface CollaborationThread {
  id: string;
  client_id: string;
  post_id: string | null;
  context_type: "content" | "task";
  task_title: string | null;
  stage_tag: string | null;
  created_at: string;
  updated_at: string;
  last_message: string | null;
  last_message_at: string | null;
  total_messages: number;
}

export interface CollaborationMessage {
  id: string;
  thread_id: string;
  author_id: string | null;
  author_role: "team" | "client";
  message: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

function buildCalendarUrl(clientId: string, view: "week" | "month", from?: string, to?: string) {
  const params = new URLSearchParams();
  params.set("view", view);
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  return `/api/clients/${clientId}/posts/calendar?${params.toString()}`;
}

export function useClientCalendar(clientId: string, view: "week" | "month", from?: string, to?: string) {
  return useQuery({
    queryKey: ["client-calendar", clientId, view, from, to],
    queryFn: () => apiGet<CalendarResponse>(buildCalendarUrl(clientId, view, from, to)),
    enabled: !!clientId,
  });
}

export function useClientKanban(clientId: string) {
  return useQuery({
    queryKey: ["client-kanban", clientId],
    queryFn: () => apiGet<KanbanResponse>(`/api/clients/${clientId}/posts/kanban`),
    enabled: !!clientId,
  });
}

export function useBatchUpdateWorkspacePosts(clientId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: {
      post_ids: string[];
      status?: WorkspacePostStatus;
      scheduled_for?: string;
      stage_tag?: string;
    }) => apiPatch<{ updated: number; items: WorkspacePostItem[] }>("/api/posts/batch", payload),
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: ["client-kanban", clientId] });
      await queryClient.cancelQueries({ queryKey: ["client-posts-list", clientId] });

      const previousKanban = queryClient.getQueryData<KanbanResponse>(["client-kanban", clientId]);
      const previousPostsList = queryClient.getQueryData<WorkspacePostItem[]>(["client-posts-list", clientId]);

      if (previousKanban) {
        const movedIds = new Set(payload.post_ids);
        const now = new Date().toISOString();
        const movedItems: WorkspacePostItem[] = [];

        const nextColumns = previousKanban.columns.map((column) => {
          const remainingItems = column.items.filter((item) => {
            if (!movedIds.has(item.id)) return true;

            movedItems.push({
              ...item,
              status: payload.status ?? item.status,
              stage_tag: payload.stage_tag ?? item.stage_tag,
              scheduled_for: payload.scheduled_for ?? item.scheduled_for,
              updated_at: now,
            });
            return false;
          });

          return {
            ...column,
            items: remainingItems,
          };
        });

        const finalColumns = nextColumns.map((column) => {
          if (!payload.status || column.id !== payload.status) return column;

          return {
            ...column,
            items: [...movedItems, ...column.items],
          };
        });

        queryClient.setQueryData<KanbanResponse>(["client-kanban", clientId], {
          ...previousKanban,
          columns: finalColumns,
        });
      }

      if (previousPostsList) {
        const movedIds = new Set(payload.post_ids);
        const now = new Date().toISOString();

        queryClient.setQueryData<WorkspacePostItem[]>(
          ["client-posts-list", clientId],
          previousPostsList.map((item) => {
            if (!movedIds.has(item.id)) return item;

            return {
              ...item,
              status: payload.status ?? item.status,
              stage_tag: payload.stage_tag ?? item.stage_tag,
              scheduled_for: payload.scheduled_for ?? item.scheduled_for,
              updated_at: now,
            };
          })
        );
      }

      return {
        previousKanban,
        previousPostsList,
      };
    },
    onError: (_error, _payload, context) => {
      if (context?.previousKanban) {
        queryClient.setQueryData(["client-kanban", clientId], context.previousKanban);
      }
      if (context?.previousPostsList) {
        queryClient.setQueryData(["client-posts-list", clientId], context.previousPostsList);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-kanban", clientId] });
      queryClient.invalidateQueries({ queryKey: ["client-calendar", clientId] });
      queryClient.invalidateQueries({ queryKey: ["client-posts-list", clientId] });
      queryClient.invalidateQueries({ queryKey: ["posts-library"] });
    },
  });
}

export function useCollaborationThreads(clientId: string, contextType?: "content" | "task") {
  return useQuery({
    queryKey: ["collaboration-threads", clientId, contextType],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (contextType) params.set("context_type", contextType);
      const query = params.toString();
      return apiGet<CollaborationThread[]>(
        query.length > 0
          ? `/api/clients/${clientId}/threads?${query}`
          : `/api/clients/${clientId}/threads`
      );
    },
    enabled: !!clientId,
  });
}

export function useCreateCollaborationThread(clientId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: {
      post_id?: string;
      context_type?: "content" | "task";
      task_title?: string;
      stage_tag?: string;
    }) => apiPost<CollaborationThread>(`/api/clients/${clientId}/threads`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collaboration-threads", clientId] });
    },
  });
}

export function useCreatePublicClientLink(clientId: string) {
  return useMutation({
    mutationFn: (payload: {
      post_id?: string;
      thread_id?: string;
      expires_in_hours?: number;
      permissions?: { can_comment?: boolean; can_update_status?: boolean };
    }) => apiPost<{
      id: string;
      url: string;
      token: string;
      expires_at: string;
      permissions: { can_comment: boolean; can_update_status: boolean };
    }>(`/api/clients/${clientId}/public-links`, payload),
  });
}

export function useThreadMessages(threadId: string | null) {
  return useQuery({
    queryKey: ["thread-messages", threadId],
    queryFn: () => apiGet<CollaborationMessage[]>(`/api/threads/${threadId}/messages`),
    enabled: !!threadId,
  });
}

export function useSendThreadMessage(clientId: string, threadId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { message: string; author_role?: "team" | "client" }) =>
      apiPost<CollaborationMessage>(`/api/threads/${threadId}/messages`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["thread-messages", threadId] });
      queryClient.invalidateQueries({ queryKey: ["collaboration-threads", clientId] });
    },
  });
}
