import { useQuery } from '@tanstack/react-query';
import { apiFetch } from './client';
import { qk } from './queryKeys';
import type { DashboardData } from '@/mocks/fixtures/dashboard';

export function useDashboard() {
  return useQuery({
    queryKey: qk.dashboard,
    queryFn: () => apiFetch<DashboardData>('/api/dashboard'),
  });
}
