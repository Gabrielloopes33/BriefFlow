/**
 * Hook para CRUD de criativos
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  Creative,
  GenerateCaptionResponse,
  GenerateCarouselDto,
  GenerateCarouselJobStatus,
  GenerateCarouselResponse,
  RefineSlideResponse,
} from '@/lib/creative-editor-types';
import { apiGet, apiPost, apiPut } from '@/lib/api';

const API_BASE = '/api/creatives';

async function fetchCreative(id: string): Promise<Creative> {
  return apiGet<Creative>(`${API_BASE}/${id}`);
}

async function fetchCreativesByClient(clientId: string): Promise<Creative[]> {
  return apiGet<Creative[]>(`${API_BASE}?client_id=${encodeURIComponent(clientId)}`);
}

async function updateCreative(id: string, data: Partial<Creative>): Promise<Creative> {
  return apiPut<Creative>(`${API_BASE}/${id}`, data);
}

async function updateExportUrls(id: string, exportUrls: string[]): Promise<Creative> {
  return apiPut<Creative>(`${API_BASE}/${id}/export-urls`, { exportUrls });
}

async function generateCreative(data: GenerateCarouselDto): Promise<GenerateCarouselResponse> {
  return apiPost<GenerateCarouselResponse>(`${API_BASE}/generate`, data);
}

async function fetchCreativeGenerationJob(jobId: string): Promise<GenerateCarouselJobStatus> {
  return apiGet<GenerateCarouselJobStatus>(`${API_BASE}/jobs/${jobId}`);
}

async function refineSlide(id: string, idx: number, instruction: string): Promise<RefineSlideResponse> {
  return apiPost<RefineSlideResponse>(`${API_BASE}/${id}/slides/${idx}/refine`, { instruction });
}

async function regenerateSlideContent(id: string, idx: number, instruction?: string): Promise<RefineSlideResponse> {
  return apiPost<RefineSlideResponse>(`${API_BASE}/${id}/slides/${idx}/generate-content`, { instruction });
}

async function generateSlideImage(id: string, idx: number, styleHint?: string): Promise<{ imageUrl: string }> {
  return apiPost<{ imageUrl: string }>(`${API_BASE}/${id}/slides/${idx}/generate-image`, { styleHint });
}

async function generateCaption(id: string, tone?: string): Promise<GenerateCaptionResponse> {
  return apiPost<GenerateCaptionResponse>(`${API_BASE}/${id}/caption`, { tone });
}

export function useCreative(id: string) {
  return useQuery({
    queryKey: ['creative', id],
    queryFn: () => fetchCreative(id),
    enabled: !!id,
  });
}

export function useCreativesByClient(clientId: string) {
  return useQuery({
    queryKey: ['creatives', 'client', clientId],
    queryFn: () => fetchCreativesByClient(clientId),
    enabled: !!clientId,
  });
}

export function useUpdateCreative() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Creative> }) => updateCreative(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['creative', data.id] });
      queryClient.invalidateQueries({ queryKey: ['creatives'] });
    },
  });
}

export function useUpdateExportUrls() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, exportUrls }: { id: string; exportUrls: string[] }) => updateExportUrls(id, exportUrls),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['creative', data.id] });
    },
  });
}

export function useGenerateCreative() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: GenerateCarouselDto) => generateCreative(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creatives'] });
    },
  });
}

export function useCreativeGenerationJob(jobId?: string) {
  return useQuery({
    queryKey: ['creative-generation-job', jobId],
    queryFn: () => fetchCreativeGenerationJob(jobId as string),
    enabled: Boolean(jobId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (!status || status === 'queued' || status === 'processing') {
        return 1200;
      }
      return false;
    },
  });
}

export function useRefineSlide() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, idx, instruction }: { id: string; idx: number; instruction: string }) =>
      refineSlide(id, idx, instruction),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['creative', variables.id] });
    },
  });
}

export function useRegenerateSlideContent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, idx, instruction }: { id: string; idx: number; instruction?: string }) =>
      regenerateSlideContent(id, idx, instruction),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['creative', variables.id] });
    },
  });
}

export function useGenerateSlideImage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, idx, styleHint }: { id: string; idx: number; styleHint?: string }) =>
      generateSlideImage(id, idx, styleHint),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['creative', variables.id] });
    },
  });
}

export function useGenerateCaption() {
  return useMutation({
    mutationFn: ({ id, tone }: { id: string; tone?: string }) => generateCaption(id, tone),
  });
}
