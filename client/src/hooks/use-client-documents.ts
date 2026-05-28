import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiDelete, apiPatch, apiFetch } from "@/lib/api";

export type DocumentType = "pdf" | "md" | "txt" | "docx" | "csv" | "json";
export type ExtractionStatus = "pending" | "processing" | "indexed" | "failed";

export interface ClientDocument {
  id: string;
  file_name: string;
  file_type: DocumentType;
  file_size: number;
  extraction_status: ExtractionStatus;
  extraction_error: string | null;
  label: string | null;
  created_at: string;
  updated_at: string;
}

export function useClientDocuments(clientId: string) {
  return useQuery({
    queryKey: ["client-documents", clientId],
    queryFn: () => apiGet<ClientDocument[]>(`/api/clients/${clientId}/documents`),
    enabled: !!clientId,
  });
}

export function useUploadDocument(clientId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await apiFetch(`/api/clients/${clientId}/documents`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Upload failed");
      }
      return res.json() as Promise<ClientDocument>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-documents", clientId] });
    },
  });
}

export function useDeleteDocument(clientId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (documentId: string) =>
      apiDelete(`/api/clients/${clientId}/documents/${documentId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-documents", clientId] });
    },
  });
}

export function useUpdateDocumentLabel(clientId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ documentId, label }: { documentId: string; label: string }) =>
      apiPatch<ClientDocument>(`/api/clients/${clientId}/documents/${documentId}`, { label }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-documents", clientId] });
    },
  });
}

export function useDocumentSignedUrl(clientId: string, documentId: string | null) {
  return useQuery({
    queryKey: ["document-url", clientId, documentId],
    queryFn: () =>
      apiGet<{ signedUrl: string }>(`/api/clients/${clientId}/documents/${documentId}/url`),
    enabled: !!documentId,
  });
}

export function useKnowledgeContext(clientId: string, query: string) {
  return useQuery({
    queryKey: ["knowledge-context", clientId, query],
    queryFn: () =>
      apiGet<Array<{ id: string; file_name: string; file_type: string; label: string | null; rank: number }>>(
        `/api/clients/${clientId}/knowledge-context?q=${encodeURIComponent(query)}`
      ),
    enabled: !!clientId && query.trim().length > 0,
  });
}
