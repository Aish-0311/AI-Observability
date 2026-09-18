import { useQuery } from '@tanstack/react-query';
import { apiFetch } from './client';
import { qk } from './queryKeys';
import type { PipelineRun } from '@/mocks/fixtures/pipeline';

export function usePipelineRuns() {
  return useQuery({
    queryKey: qk.pipelineRuns,
    queryFn: () => apiFetch<PipelineRun[]>('/api/pipeline/runs'),
  });
}

export function usePipelineRun(runId: string) {
  return useQuery({
    queryKey: qk.pipelineRun(runId),
    queryFn: () => apiFetch<PipelineRun>(`/api/pipeline/runs/${runId}`),
    enabled: !!runId,
  });
}
