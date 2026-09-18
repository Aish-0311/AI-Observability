export type AlertSeverity = 'Sev0' | 'Sev1' | 'Sev2' | 'Sev3' | 'Sev4';
export type AlertStatus = 'firing' | 'resolved';
export type AlertSource = 'App Insights' | 'Grafana' | 'Prometheus' | 'Log Analytics';

export interface AlertPayload {
  alert_id: string;
  severity: AlertSeverity;
  fired_at: string;
  resource_id: string;
  resource_name: string;
  resource_type: string;
  condition_type: string;
  description: string;
  alert_rule_name: string;
  source?: AlertSource;
  status?: AlertStatus;
  incident_id?: string;
  raw?: Record<string, unknown>;
}
