import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './client';
import { qk } from './queryKeys';
import type { UserSettings, PingResult } from '@/types/azure';

export function useSettings() {
  return useQuery({
    queryKey: qk.settings,
    queryFn: () => apiFetch<UserSettings>('/api/settings'),
    staleTime: 5 * 60 * 1000,
  });
}

export function useSaveSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (settings: UserSettings) =>
      apiFetch<UserSettings>('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.settings });
      qc.invalidateQueries({ queryKey: qk.sources });
      qc.invalidateQueries({ queryKey: qk.services });
    },
  });
}

export function useDisconnectAzure() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<void>('/api/settings/azure', { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.settings });
      qc.invalidateQueries({ queryKey: qk.sources });
      qc.invalidateQueries({ queryKey: qk.services });
    },
  });
}

export function useTestSettings() {
  return useMutation({
    mutationFn: (settings: UserSettings) =>
      apiFetch<PingResult>('/api/settings/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      }),
  });
}
