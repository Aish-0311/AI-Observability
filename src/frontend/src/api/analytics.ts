import { useQuery } from '@tanstack/react-query';
import { apiFetch } from './client';
import { qk } from './queryKeys';
import type { AnalyticsData } from '@/mocks/fixtures/analytics';

export function useAnalytics() {
  return useQuery({
    queryKey: qk.analytics,
    queryFn: () => apiFetch<AnalyticsData>('/api/analytics'),
  });
}
