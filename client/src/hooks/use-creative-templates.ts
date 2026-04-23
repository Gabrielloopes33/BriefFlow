/**
 * Hook para buscar templates de criativos
 */

import { useQuery } from '@tanstack/react-query';
import type { CreativeTemplate } from '@/lib/creative-editor-types';

const API_BASE = '/api/creative-templates';

async function fetchTemplates(): Promise<CreativeTemplate[]> {
  const res = await fetch(API_BASE);
  if (!res.ok) throw new Error('Failed to fetch templates');
  return res.json();
}

export function useCreativeTemplates() {
  return useQuery({
    queryKey: ['creative-templates'],
    queryFn: fetchTemplates,
  });
}
