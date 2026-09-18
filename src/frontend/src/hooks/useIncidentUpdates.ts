import { useEffect, useCallback } from 'react';
import * as signalR from '@microsoft/signalr';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

interface AlertSummary {
  id: string;
  alertRule: string;
  severity: string;
  resourceName: string;
  originalFiredDateTime: string;
  lastReceivedDateTime: string;
  receivedCount: number;
  caller?: string;
}

export type { AlertSummary };

export function useIncidentUpdates(
  onAlertReceived: (alert: AlertSummary) => void,
  enabled: boolean = true
) {
  const connectionRef = useCallback(() => {
    if (!enabled) return undefined;

    const hubUrl = `${BASE_URL}/hubs/incidents`;

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        withCredentials: true,
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .withHubProtocol(new signalR.JsonHubProtocol())
      .configureLogging(signalR.LogLevel.Information)
      .build();

    connection.on('AlertReceived', (alert: AlertSummary) => {
      onAlertReceived(alert);
    });

    connection.on('InitialIncidents', (alerts: AlertSummary[]) => {
      console.log('Received initial incidents:', alerts);
    });

    connection.onreconnected(() => {
      console.log('Reconnected to incidents hub');
    });

    connection.onreconnecting(() => {
      console.log('Reconnecting to incidents hub...');
    });

    connection.onclose(() => {
      console.log('Disconnected from incidents hub');
    });

    return connection;
  }, [enabled, onAlertReceived]);

  useEffect(() => {
    if (!enabled) return;

    const connection = connectionRef();
    if (!connection) return;

    let isMounted = true;

    const startConnection = async () => {
      try {
        await connection.start();
        console.log('Connected to incidents hub');

        // Subscribe to incidents
        await connection.invoke('SubscribeToIncidents');
      } catch (err) {
        console.error('Failed to connect to incidents hub:', err);
        if (isMounted) {
          // Try reconnecting in 5 seconds
          setTimeout(startConnection, 5000);
        }
      }
    };

    startConnection();

    return () => {
      isMounted = false;
      connection?.stop();
    };
  }, [connectionRef, enabled]);
}
