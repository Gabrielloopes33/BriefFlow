import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiDelete, apiPatch, apiFetch } from "@/lib/api";

export interface MoodboardImage {
  id: string;
  file_name: string;
  public_url: string;
  label: string | null;
  display_order: number;
  created_at: string;
}

export function useClientMoodboard(clientId: string) {
  return useQuery({
    queryKey: ["client-moodboard", clientId],
    queryFn: () => apiGet<MoodboardImage[]>(`/api/clients/${clientId}/moodboard`),
    enabled: !!clientId,
  });
}

export function useUploadMoodboardImages(clientId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (files: File[]) => {
      const formData = new FormData();
      for (const file of files) {
        formData.append("files", file);
      }
      const res = await apiFetch(`/api/clients/${clientId}/moodboard`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Upload failed");
      }
      return res.json() as Promise<MoodboardImage[]>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-moodboard", clientId] });
    },
  });
}

export function useDeleteMoodboardImage(clientId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (imageId: string) =>
      apiDelete(`/api/clients/${clientId}/moodboard/${imageId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-moodboard", clientId] });
    },
  });
}

export function useUpdateMoodboardImage(clientId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      imageId,
      label,
      display_order,
    }: {
      imageId: string;
      label?: string;
      display_order?: number;
    }) =>
      apiPatch<MoodboardImage>(`/api/clients/${clientId}/moodboard/${imageId}`, {
        label,
        display_order,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-moodboard", clientId] });
    },
  });
}
