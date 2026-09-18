import { useQuery } from '@tanstack/react-query';
import { apiFetch } from './client';
import { qk } from './queryKeys';
import type { Agent } from '@/mocks/fixtures/agents';

export function useAgents() {
  return useQuery({
    queryKey: qk.agents,
    queryFn: () => apiFetch<Agent[]>('/api/agents'),
  });
}
