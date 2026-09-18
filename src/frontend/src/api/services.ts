import { useQuery } from '@tanstack/react-query';
import { apiFetch } from './client';
import { qk } from './queryKeys';
import type { ServiceMapData, ServiceDetailResponse } from '@/types/azure';

export function useServices() {
  return useQuery({
    queryKey: qk.services,
    queryFn: () => apiFetch<ServiceMapData>('/api/services'),
  });
}

export function useServiceDetail(id: string | null) {
  return useQuery({
    queryKey: qk.serviceDetail(id ?? ''),
    queryFn: () => apiFetch<ServiceDetailResponse>(`/api/services/${encodeURIComponent(id!)}`),
    enabled: !!id,
    staleTime: 30_000,
  });
}
