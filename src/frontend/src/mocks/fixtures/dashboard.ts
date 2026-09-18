export interface DashboardKpis {
  active_incidents: number;
  alerts_24h: number;
  mttr_minutes: number;
  sources_up: number;
  sources_total: number;
}
export interface IncidentDataPoint { date: string; total: number; sev0: number; sev1: number; sev2: number; sev3: number; sev4: number; }
export interface SeverityCount { severity: string; count: number; }
export interface DashboardData { kpis: DashboardKpis; incidents_over_time: IncidentDataPoint[]; severity_distribution: SeverityCount[]; }

const d = (daysAgo: number) => { const x = new Date(); x.setDate(x.getDate() - daysAgo); return x.toISOString().slice(0, 10); };

export const dashboardData: DashboardData = {
  kpis: { active_incidents: 4, alerts_24h: 27, mttr_minutes: 38, sources_up: 3, sources_total: 4 },
  incidents_over_time: [
    { date: d(13), total: 1, sev0: 0, sev1: 1, sev2: 0, sev3: 0, sev4: 0 },
    { date: d(12), total: 3, sev0: 0, sev1: 1, sev2: 1, sev3: 1, sev4: 0 },
    { date: d(11), total: 2, sev0: 0, sev1: 0, sev2: 2, sev3: 0, sev4: 0 },
    { date: d(10), total: 0, sev0: 0, sev1: 0, sev2: 0, sev3: 0, sev4: 0 },
    { date: d(9),  total: 4, sev0: 1, sev1: 1, sev2: 1, sev3: 1, sev4: 0 },
    { date: d(8),  total: 2, sev0: 0, sev1: 1, sev2: 0, sev3: 1, sev4: 0 },
    { date: d(7),  total: 1, sev0: 0, sev1: 0, sev2: 1, sev3: 0, sev4: 0 },
    { date: d(6),  total: 3, sev0: 0, sev1: 2, sev2: 1, sev3: 0, sev4: 0 },
    { date: d(5),  total: 5, sev0: 1, sev1: 2, sev2: 1, sev3: 1, sev4: 0 },
    { date: d(4),  total: 2, sev0: 0, sev1: 0, sev2: 1, sev3: 0, sev4: 1 },
    { date: d(3),  total: 3, sev0: 0, sev1: 1, sev2: 1, sev3: 1, sev4: 0 },
    { date: d(2),  total: 4, sev0: 0, sev1: 1, sev2: 2, sev3: 1, sev4: 0 },
    { date: d(1),  total: 2, sev0: 0, sev1: 1, sev2: 0, sev3: 1, sev4: 0 },
    { date: d(0),  total: 4, sev0: 1, sev1: 1, sev2: 1, sev3: 1, sev4: 0 },
  ],
  severity_distribution: [
    { severity: 'Sev0', count: 1 }, { severity: 'Sev1', count: 2 },
    { severity: 'Sev2', count: 4 }, { severity: 'Sev3', count: 2 }, { severity: 'Sev4', count: 1 },
  ],
};
