import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "@/lib/api";
import { useEffect } from "react";
import { useAuth } from "./use-auth";
import type { JobEvent } from "../../../server/websocket/job-events";

export interface DashboardClient {
  id: string;
  name: string;
  niche: string | null;
  last_post_at: string | null;
  post_count: number;
}

export interface DashboardJob {
  id: string;
  client_id: string;
  client_name: string;
  status: string;
  stage: string;
  progress: number;
  result_post_id: string | null;
  created_at: string;
  updated_at: string;
  error: string | null;
}

export interface DashboardSummary {
  clients: DashboardClient[];
  recent_jobs: DashboardJob[];
  metrics: {
    posts_this_month: number;
    active_clients: number;
    jobs_in_progress: number;
  };
}

const DASHBOARD_QUERY_KEY = ["dashboard", "summary"];
const REFETCH_INTERVAL_MS = 30_000;

export function useDashboard() {
  return useQuery({
    queryKey: DASHBOARD_QUERY_KEY,
    queryFn: async () => {
      return apiGet<DashboardSummary>("/api/dashboard/summary");
    },
    refetchInterval: REFETCH_INTERVAL_MS,
    staleTime: 10_000,
  });
}

export function useCancelJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (jobId: string) => apiPost(`/api/jobs/${jobId}/cancel`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEY });
    },
  });
}

/**
 * Hook que integra WebSocket (S5-01) com o dashboard.
 * Quando um evento de job chega via WS, atualiza a query do dashboard
 * em vez de esperar o próximo polling.
 */
export function useDashboardWebSocketIntegration() {
  const queryClient = useQueryClient();
  const { session } = useAuth();

  useEffect(() => {
    if (!session?.access_token) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws?token=${session.access_token}`;

    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 3;

    function connect() {
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        reconnectAttempts = 0;
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as JobEvent;
          if (
            data.type === "job:complete" ||
            data.type === "job:failed" ||
            data.type === "job:stage"
          ) {
            // Invalidate dashboard query to trigger refetch
            queryClient.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEY });
          }
        } catch {
          // Ignore malformed messages
        }
      };

      ws.onclose = () => {
        if (reconnectAttempts < maxReconnectAttempts) {
          reconnectAttempts++;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
          reconnectTimer = setTimeout(connect, delay);
        }
      };

      ws.onerror = () => {
        // Let onclose handle reconnection
      };
    }

    connect();

    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (ws) {
        ws.onclose = null;
        ws.close();
      }
    };
  }, [session?.access_token, queryClient]);
}
