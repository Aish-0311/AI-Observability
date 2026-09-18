import { http, HttpResponse, delay } from 'msw';
import { incidents } from './fixtures/incidents';
import { alerts } from './fixtures/alerts';
import { dashboardData } from './fixtures/dashboard';
import { analyticsData } from './fixtures/analytics';
import { costsData } from './fixtures/costs';
import { pipelineRuns } from './fixtures/pipeline';
import { runbooks } from './fixtures/runbooks';
import { agents } from './fixtures/agents';

const D = 350;

export const handlers = [
  http.get('/api/dashboard', async () => {
    await delay(D);
    return HttpResponse.json(dashboardData);
  }),

  http.get('/api/incidents', async ({ request }) => {
    await delay(D);
    const url = new URL(request.url);
    const severity = url.searchParams.get('severity');
    const source = url.searchParams.get('source');
    const q = url.searchParams.get('q')?.toLowerCase();
    let result = [...incidents];
    if (severity) result = result.filter(i => i.severity === severity);
    if (source) result = result.filter(i => i.source === source);
    if (q) result = result.filter(i =>
      i.id.toLowerCase().includes(q) ||
      i.resource_name.toLowerCase().includes(q) ||
      i.rca.summary.toLowerCase().includes(q) ||
      i.alert_rule_name.toLowerCase().includes(q)
    );
    return HttpResponse.json(result);
  }),

  http.get('/api/incidents/:id', async ({ params }) => {
    await delay(D);
    const inc = incidents.find(i => i.id === params.id);
    if (!inc) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(inc);
  }),

  http.get('/api/alerts', async ({ request }) => {
    await delay(D);
    const url = new URL(request.url);
    const severity = url.searchParams.get('severity');
    const source = url.searchParams.get('source');
    const status = url.searchParams.get('status');
    let result = [...alerts];
    if (severity) result = result.filter(a => a.severity === severity);
    if (source) result = result.filter(a => a.source === source);
    if (status) result = result.filter(a => a.status === status);
    return HttpResponse.json(result);
  }),

  http.get('/api/analytics', async () => {
    await delay(D);
    return HttpResponse.json(analyticsData);
  }),

  http.get('/api/costs', async () => {
    await delay(D);
    return HttpResponse.json(costsData);
  }),

  http.get('/api/pipeline/runs', async () => {
    await delay(D);
    return HttpResponse.json(pipelineRuns);
  }),

  http.get('/api/pipeline/runs/:runId', async ({ params }) => {
    await delay(D);
    const run = pipelineRuns.find(r => r.run_id === params.runId);
    if (!run) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(run);
  }),

  http.get('/api/knowledge/runbooks', async ({ request }) => {
    await delay(D);
    const url = new URL(request.url);
    const q = url.searchParams.get('q')?.toLowerCase();
    let result = [...runbooks];
    if (q) result = result.filter(r =>
      r.title.toLowerCase().includes(q) ||
      r.summary.toLowerCase().includes(q) ||
      r.category.toLowerCase().includes(q)
    );
    return HttpResponse.json(result);
  }),

  http.get('/api/agents', async () => {
    await delay(D);
    return HttpResponse.json(agents);
  }),

  http.post('/api/login', async ({ request }) => {
    await delay(D);
    const body = await request.json() as { email?: string; password?: string };
    if (body?.password === 'ClusterReply2026!') {
      const namePart = (body.email ?? 'cluster@reply.de').split('@')[0];
      const name = namePart.replace(/\./g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      return HttpResponse.json({ email: body.email, name, role: 'sre' });
    }
    return new HttpResponse(JSON.stringify({ message: 'Invalid credentials' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }),

  http.post('/api/logout', async () => {
    await delay(100);
    return new HttpResponse(null, { status: 204 });
  }),
];
