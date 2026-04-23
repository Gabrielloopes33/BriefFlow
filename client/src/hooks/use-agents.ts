import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api";

export interface Agent {
  id: string;
  name: string;
  description: string;
  role: "researcher" | "writer" | "reviewer" | "custom";
  system_prompt: string;
  model: string;
  temperature: number;
  max_tokens: number;
  tools: any[];
  config: Record<string, any>;
  is_active: boolean;
  created_at: string;
}

export interface CreateAgentInput {
  name: string;
  description?: string;
  role: "researcher" | "writer" | "reviewer" | "custom";
  system_prompt: string;
  model?: string;
  temperature?: number;
  max_tokens?: number;
  tools?: any[];
  config?: Record<string, any>;
}

export function useAgents() {
  return useQuery({
    queryKey: ["agents"],
    queryFn: () => apiGet<Agent[]>("/api/agents"),
  });
}

export function useAgent(id: string) {
  return useQuery({
    queryKey: ["agents", id],
    queryFn: () => apiGet<Agent>(`/api/agents/${id}`),
    enabled: !!id,
  });
}

export function useCreateAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateAgentInput) => apiPost<Agent>("/api/agents", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
    },
  });
}

export function useUpdateAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateAgentInput> }) =>
      apiPut<Agent>(`/api/agents/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
      queryClient.invalidateQueries({ queryKey: ["agents", variables.id] });
    },
  });
}

export function useDeleteAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDelete(`/api/agents/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
    },
  });
}
