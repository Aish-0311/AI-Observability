import { BarChart3, Activity, Eye, FileText, AlertCircle } from 'lucide-react';

interface AlertSourceIconProps {
  source?: string;
  signalType?: string;
  size?: number;
  className?: string;
}

/**
 * Maps Azure alert sources and signal types to appropriate icons
 */
export function AlertSourceIcon({
  source,
  signalType,
  size = 16,
  className = '',
}: AlertSourceIconProps) {
  // Map by signal type first (more specific)
  if (signalType) {
    switch (signalType.toLowerCase()) {
      case 'metric':
      case 'metric_alert':
        return (
          <BarChart3
            size={size}
            className={className}
            aria-label="Metric Alert"
            style={{ color: '#0078d4' }} // Azure blue
          />
        );
      case 'log':
      case 'log_query':
        return (
          <FileText
            size={size}
            className={className}
            aria-label="Log Query"
            style={{ color: '#6b8e23' }} // Olive green
          />
        );
      case 'activity_log':
      case 'activity log':
        return (
          <Eye
            size={size}
            className={className}
            aria-label="Activity Log"
            style={{ color: '#ff8c00' }} // Orange
          />
        );
      case 'trace':
        return (
          <Activity
            size={size}
            className={className}
            aria-label="Trace"
            style={{ color: '#1e90ff' }} // Dodger blue
          />
        );
      case 'error_rate':
      case 'dependency_failure':
        return (
          <AlertCircle
            size={size}
            className={className}
            aria-label="Error"
            style={{ color: '#d32f2f' }} // Red
          />
        );
      default:
        return (
          <AlertCircle
            size={size}
            className={className}
            aria-label="Alert"
            style={{ color: '#757575' }} // Gray
          />
        );
    }
  }

  // Map by source (fallback)
  switch (source?.toLowerCase()) {
    case 'appinsights':
    case 'app insights':
      return (
        <Activity
          size={size}
          className={className}
          aria-label="Application Insights"
          style={{ color: '#0078d4' }} // Azure blue
        />
      );
    case 'loganalytics':
    case 'log analytics':
      return (
        <FileText
          size={size}
          className={className}
          aria-label="Log Analytics"
          style={{ color: '#6b8e23' }} // Olive green
        />
      );
    case 'grafana':
      return (
        <BarChart3
          size={size}
          className={className}
          aria-label="Grafana"
          style={{ color: '#ff9830' }} // Grafana orange
        />
      );
    case 'prometheus':
      return (
        <BarChart3
          size={size}
          className={className}
          aria-label="Prometheus"
          style={{ color: '#e6522c' }} // Prometheus red
        />
      );
    case 'activity log':
      return (
        <Eye
          size={size}
          className={className}
          aria-label="Activity Log"
          style={{ color: '#ff8c00' }} // Orange
        />
      );
    default:
      return (
        <AlertCircle
          size={size}
          className={className}
          aria-label="Unknown Source"
          style={{ color: '#9e9e9e' }} // Light gray
        />
      );
  }
}
