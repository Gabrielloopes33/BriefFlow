import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "@/lib/api";

export interface AgentExecution {
  id: string;
  status: "running" | "completed" | "failed" | "canceled";
  current_node_id: string | null;
  started_at: string;
  completed_at: string | null;
  graph_name: string;
  job_id: string;
}

export interface AgentExecutionDetail extends AgentExecution {
  node_results: Record<string, any>;
  trace_id: string | null;
  metadata: Record<string, any>;
  nodes: any[];
  edges: any[];
}

export function useAgentExecutions() {
  return useQuery({
    queryKey: ["agent-executions"],
    queryFn: () => apiGet<AgentExecution[]>("/api/agent-executions"),
  });
}

export function useAgentExecution(id: string) {
  return useQuery({
    queryKey: ["agent-executions", id],
    queryFn: () => apiGet<AgentExecutionDetail>(`/api/agent-executions/${id}`),
    enabled: !!id,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data?.status === "running") return 2000;
      return false;
    },
  });
}

export function useCancelExecution() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiPost(`/api/agent-executions/${id}/cancel`, {}),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["agent-executions"] });
      queryClient.invalidateQueries({ queryKey: ["agent-executions", id] });
    },
  });
}
