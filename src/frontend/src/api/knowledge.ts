import { useQuery } from '@tanstack/react-query';
import { apiFetch } from './client';
import { qk } from './queryKeys';
import type { Runbook } from '@/mocks/fixtures/runbooks';

export function useRunbooks(q?: string) {
  const qs = q ? `?q=${encodeURIComponent(q)}` : '';
  return useQuery({
    queryKey: qk.runbooks(q),
    queryFn: () => apiFetch<Runbook[]>(`/api/knowledge/runbooks${qs}`),
  });
}
