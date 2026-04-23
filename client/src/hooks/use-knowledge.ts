import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "./use-toast";
import { apiDelete, apiGet, apiPost } from "@/lib/api";

export function useKnowledgeItems(clientId: string) {
  return useQuery({
    queryKey: ['knowledge-items', clientId],
    queryFn: async () => {
      if (!clientId) return [];

      return apiGet<any[]>(`/api/clients/${clientId}/knowledge`);
    },
    enabled: !!clientId,
  });
}

export function useDeleteKnowledgeItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (itemId: string) => {
      await apiDelete(`/api/knowledge/${itemId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-items'] });
      toast({ title: "Sucesso", description: "Item excluído com sucesso" });
    },
    onError: (error: any) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });
}

export function useCreateKnowledgeItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: { 
      clientId: string; 
      title: string; 
      content: string; 
      type: string; 
      sourceUrl?: string 
    }) => {
      return apiPost<any>(`/api/clients/${data.clientId}/knowledge`, {
        title: data.title,
        content: data.content,
        type: data.type,
        source_url: data.sourceUrl,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-items'] });
      toast({ title: "Sucesso", description: "Item salvo na base de conhecimento" });
    },
    onError: (error: any) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });
}
