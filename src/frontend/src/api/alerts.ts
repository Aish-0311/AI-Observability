import { useQuery } from '@tanstack/react-query';
import { apiFetch } from './client';
import { qk } from './queryKeys';
import type { AlertPayload } from '@/types/alerts';

interface AlertFilters { severity?: string; source?: string; status?: string; q?: string; }

export function useAlerts(filters?: AlertFilters) {
  const params = new URLSearchParams();
  if (filters?.severity) params.set('severity', filters.severity);
  if (filters?.source) params.set('source', filters.source);
  if (filters?.status) params.set('status', filters.status);
  if (filters?.q) params.set('q', filters.q);
  const qs = params.toString();
  return useQuery({
    queryKey: qk.alerts(filters),
    queryFn: () => apiFetch<AlertPayload[]>(`/api/alerts${qs ? `?${qs}` : ''}`),
  });
}
