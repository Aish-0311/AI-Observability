export interface MttrDataPoint { date: string; mttr_minutes: number; incidents: number; }
export interface ServiceIncidentCount { service: string; count: number; sev0: number; sev1: number; sev2plus: number; }
export interface SlaEntry { severity: string; target_minutes: number; actual_avg_minutes: number; compliance_pct: number; }
export interface AnalyticsData { period_days: number; total_incidents: number; resolved_incidents: number; avg_mttr_minutes: number; sla_compliance_pct: number; mttr_trend: MttrDataPoint[]; by_service: ServiceIncidentCount[]; sla_table: SlaEntry[]; }

const bd = (daysAgo: number) => { const d = new Date(); d.setDate(d.getDate() - daysAgo); return d.toISOString().slice(0, 10); };

export const analyticsData: AnalyticsData = {
  period_days: 30, total_incidents: 47, resolved_incidents: 43, avg_mttr_minutes: 38, sla_compliance_pct: 84,
  mttr_trend: [
    { date: bd(29), mttr_minutes: 52, incidents: 2 }, { date: bd(27), mttr_minutes: 44, incidents: 3 },
    { date: bd(25), mttr_minutes: 68, incidents: 1 }, { date: bd(23), mttr_minutes: 31, incidents: 4 },
    { date: bd(21), mttr_minutes: 28, incidents: 2 }, { date: bd(19), mttr_minutes: 55, incidents: 3 },
    { date: bd(17), mttr_minutes: 42, incidents: 2 }, { date: bd(15), mttr_minutes: 37, incidents: 5 },
    { date: bd(13), mttr_minutes: 29, incidents: 3 }, { date: bd(11), mttr_minutes: 19, incidents: 4 },
    { date: bd(9),  mttr_minutes: 33, incidents: 2 }, { date: bd(7),  mttr_minutes: 41, incidents: 4 },
    { date: bd(5),  mttr_minutes: 26, incidents: 5 }, { date: bd(3),  mttr_minutes: 35, incidents: 3 },
    { date: bd(1),  mttr_minutes: 22, incidents: 4 },
  ],
  by_service: [
    { service: 'checkout-api',         count: 8,  sev0: 1, sev1: 3, sev2plus: 4 },
    { service: 'payment-gateway',      count: 7,  sev0: 1, sev1: 2, sev2plus: 4 },
    { service: 'auth-service',         count: 6,  sev0: 0, sev1: 3, sev2plus: 3 },
    { service: 'order-processor',      count: 5,  sev0: 0, sev1: 2, sev2plus: 3 },
    { service: 'aks-prod-westeu',      count: 4,  sev0: 0, sev1: 1, sev2plus: 3 },
    { service: 'api-gateway',          count: 4,  sev0: 0, sev1: 1, sev2plus: 3 },
    { service: 'notification-service', count: 3,  sev0: 0, sev1: 1, sev2plus: 2 },
    { service: 'redis-cache',          count: 3,  sev0: 0, sev1: 0, sev2plus: 3 },
  ],
  sla_table: [
    { severity: 'Sev0', target_minutes: 15,   actual_avg_minutes: 22,  compliance_pct: 62 },
    { severity: 'Sev1', target_minutes: 60,   actual_avg_minutes: 48,  compliance_pct: 81 },
    { severity: 'Sev2', target_minutes: 240,  actual_avg_minutes: 195, compliance_pct: 88 },
    { severity: 'Sev3', target_minutes: 480,  actual_avg_minutes: 310, compliance_pct: 95 },
    { severity: 'Sev4', target_minutes: 1440, actual_avg_minutes: 620, compliance_pct: 98 },
  ],
};
