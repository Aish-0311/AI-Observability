const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, { ...init, credentials: 'include' });
  if (res.status === 204) return undefined as T;
  const contentType = res.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    if (contentType.includes('text/html')) {
      throw new Error(`No mock handler found for ${path} — got HTML response. Is MSW running?`);
    }
    throw new Error(`Unexpected content-type "${contentType}" for ${path}`);
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error((err as { message?: string }).message ?? res.statusText);
  }
  return res.json() as Promise<T>;
}
