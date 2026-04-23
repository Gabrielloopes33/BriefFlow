/**
 * Hook para CRUD de criativos
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Creative } from '@/lib/creative-editor-types';

const API_BASE = '/api/creatives';

async function fetchCreative(id: string): Promise<Creative> {
  const res = await fetch(`${API_BASE}/${id}`);
  if (!res.ok) throw new Error('Failed to fetch creative');
  return res.json();
}

async function fetchCreativesByClient(clientId: string): Promise<Creative[]> {
  const res = await fetch(`${API_BASE}?client_id=${clientId}`);
  if (!res.ok) throw new Error('Failed to fetch creatives');
  return res.json();
}

async function updateCreative(id: string, data: Partial<Creative>): Promise<Creative> {
  const res = await fetch(`${API_BASE}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update creative');
  return res.json();
}

async function updateExportUrls(id: string, exportUrls: string[]): Promise<Creative> {
  const res = await fetch(`${API_BASE}/${id}/export-urls`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ exportUrls }),
  });
  if (!res.ok) throw new Error('Failed to update export URLs');
  return res.json();
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
