import { useQuery } from '@tanstack/react-query';
import { apiFetch } from './client';
import { qk } from './queryKeys';
import type { Incident } from '@/mocks/fixtures/incidents';

interface IncidentFilters {
  severity?: string;
  source?: string;
  q?: string;
  pageNumber?: number;
  pageSize?: number;
}

interface PaginatedIncidentsResponse {
  data: Incident[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export function useIncidents(filters?: IncidentFilters) {
  const params = new URLSearchParams();
  if (filters?.severity) params.set('severity', filters.severity);
  if (filters?.source) params.set('source', filters.source);
  if (filters?.q) params.set('q', filters.q);
  if (filters?.pageNumber) params.set('pageNumber', filters.pageNumber.toString());
  if (filters?.pageSize) params.set('pageSize', filters.pageSize.toString());
  
  const qs = params.toString();

  return useQuery({
    queryKey: qk.incidents(filters),
    queryFn: () => apiFetch<PaginatedIncidentsResponse>(`/api/incidents${qs ? `?${qs}` : ''}`),
  });
}

export function useIncident(id: string) {
  return useQuery({
    queryKey: qk.incident(id),
    queryFn: () => apiFetch<Incident>(`/api/incidents/${id}`),
    enabled: !!id,
  });
}
