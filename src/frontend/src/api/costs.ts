import { useQuery } from '@tanstack/react-query';
import { apiFetch } from './client';
import { qk } from './queryKeys';
import type { CostsData } from '@/mocks/fixtures/costs';

export function useCosts() {
  return useQuery({
    queryKey: qk.costs,
    queryFn: () => apiFetch<CostsData>('/api/costs'),
  });
}
