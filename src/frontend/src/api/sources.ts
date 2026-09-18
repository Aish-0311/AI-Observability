import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './client';
import { qk } from './queryKeys';
import type { SourceIntegration } from '@/types/sources';

export function useSources() {
  return useQuery({
    queryKey: qk.sources,
    queryFn: () => apiFetch<SourceIntegration[]>('/api/sources'),
  });
}

export function useRefreshSources() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch<{ refreshed: boolean }>('/api/sources/refresh', { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.sources }),
  });
}
