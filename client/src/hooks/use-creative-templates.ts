/**
 * Hook para buscar templates de criativos
 */

import { useQuery } from '@tanstack/react-query';
import type { CreativeTemplate } from '@/lib/creative-editor-types';
import { apiGet } from '@/lib/api';

const API_BASE = '/api/creative-templates';

async function fetchTemplates(): Promise<CreativeTemplate[]> {
  return apiGet<CreativeTemplate[]>(API_BASE);
}

export function useCreativeTemplates() {
  return useQuery({
    queryKey: ['creative-templates'],
    queryFn: fetchTemplates,
  });
}
