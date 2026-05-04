import { useMutation, useQuery } from "@tanstack/react-query";
import { apiGet, apiPost, apiPut } from "@/lib/api";

export interface PublicClientContext {
  client: {
    id: string;
    name: string;
    description?: string | null;
  } | null;
  post: {
    id: string;
    client_id: string;
    title: string | null;
    content: string | null;
    status: string;
    stage_tag: string | null;
    scheduled_for: string | null;
    created_at: string;
    updated_at: string;
  } | null;
  thread: {
    id: string;
    client_id: string;
    post_id: string | null;
    context_type: "content" | "task";
    task_title: string | null;
    stage_tag: string | null;
    created_at: string;
    updated_at: string;
  } | null;
  messages: Array<{
    id: string;
    thread_id: string;
    author_role: "team" | "client";
    message: string;
    metadata: Record<string, unknown>;
    created_at: string;
  }>;
  permissions: {
    can_comment?: boolean;
    can_update_status?: boolean;
  };
  expires_at: string;
}

export function usePublicClientAccess(token: string | null) {
  return useQuery({
    queryKey: ["public-client-access", token],
    queryFn: () => apiGet<PublicClientContext>(`/api/public/access/${token}`, { skipAuth: true }),
    enabled: !!token,
    refetchOnWindowFocus: false,
  });
}

export function usePublicClientMessage(token: string | null) {
  return useMutation({
    mutationFn: (payload: { message: string; metadata?: Record<string, unknown> }) =>
      apiPost(`/api/public/access/${token}/messages`, payload, { skipAuth: true }),
  });
}

export function usePublicClientStatus(token: string | null) {
  return useMutation({
    mutationFn: (payload: { status: string }) =>
      apiPut(`/api/public/access/${token}/status`, payload, { skipAuth: true }),
  });
}
