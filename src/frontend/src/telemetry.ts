import { ApplicationInsights } from '@microsoft/applicationinsights-web';

const connectionString = import.meta.env.VITE_APPINSIGHTS_CONNECTION_STRING;

let appInsights: ApplicationInsights | undefined;

export function initializeTelemetry(): ApplicationInsights | undefined {
  if (!connectionString || appInsights) {
    return appInsights;
  }

  appInsights = new ApplicationInsights({
    config: {
      connectionString,
      enableAutoRouteTracking: true,
      disableFetchTracking: false,
      disableAjaxTracking: false,
    },
  });

  appInsights.loadAppInsights();
  appInsights.addTelemetryInitializer((item) => {
    item.tags = item.tags ?? {};
    item.tags['ai.cloud.role'] = 'ai-obs-frontend';
  });
  appInsights.trackPageView();

  return appInsights;
}
