import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api";

export interface GraphNode {
  id: string;
  agentId: string;
  type: "researcher" | "writer" | "reviewer" | "custom" | "metrics-analyst" | "references" | "visual-formatter";
  position?: { x: number; y: number };
  config?: Record<string, any>;
}

export interface GraphEdge {
  id: string;
  from: string;
  to: string;
  condition?: string;
}

export interface AgentGraph {
  id: string;
  name: string;
  description: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  is_active: boolean;
  is_default: boolean;
  created_at: string;
  execution_count?: number;
}

export interface CreateGraphInput {
  name: string;
  description?: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  is_default?: boolean;
}

export function useAgentGraphs() {
  return useQuery({
    queryKey: ["agent-graphs"],
    queryFn: async () => {
      const data = await apiGet<AgentGraph[]>("/api/agent-graphs");
      return data.map((g) => ({
        ...g,
        nodes: g.nodes || [],
        edges: g.edges || [],
      }));
    },
  });
}

export function useAgentGraph(id: string) {
  return useQuery({
    queryKey: ["agent-graphs", id],
    queryFn: async () => {
      const data = await apiGet<AgentGraph>(`/api/agent-graphs/${id}`);
      return {
        ...data,
        nodes: data.nodes || [],
        edges: data.edges || [],
      };
    },
    enabled: !!id,
  });
}

export function useCreateAgentGraph() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateGraphInput) => apiPost<AgentGraph>("/api/agent-graphs", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent-graphs"] });
    },
  });
}

export function useUpdateAgentGraph() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateGraphInput> }) =>
      apiPut<AgentGraph>(`/api/agent-graphs/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["agent-graphs"] });
      queryClient.invalidateQueries({ queryKey: ["agent-graphs", variables.id] });
    },
  });
}

export function useDeleteAgentGraph() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDelete(`/api/agent-graphs/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent-graphs"] });
    },
  });
}
