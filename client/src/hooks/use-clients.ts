import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "./use-toast";
import { apiGet, apiPost, apiPut } from "@/lib/api";

export function useClients() {
  return useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      return apiGet<any[]>('/api/clients');
    },
  });
}

export function useClient(clientId: string) {
  return useQuery({
    queryKey: ['client', clientId],
    queryFn: async () => {
      return apiGet<any>(`/api/clients/${clientId}`);
    },
    enabled: !!clientId,
  });
}

export function useCreateClient() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: { name: string; description?: string; niche?: string; target_audience?: string }) => {
      return apiPost<any>('/api/clients', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast({ title: "Success", description: "Client created successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateClient() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...data }: Record<string, any> & { id: string }) => {
      return apiPut<any>(`/api/clients/${id}`, data);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['client', variables.id] });
      toast({ title: "Sucesso", description: "Cliente atualizado com sucesso" });
    },
    onError: (error: any) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });
}
