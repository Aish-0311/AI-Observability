# Alert To Incident Workflow

This document describes the runtime flow from receiving an Azure webhook alert to rendering updates in the UI.

## Overview

- Raw alert timeline events are stored in `Data/alerts.json`.
- Deduplicated operational incidents are stored in `Data/incidents.json`.
- Realtime UI updates are pushed via SignalR (`/hubs/incidents`).

## End-to-End Flow

1. Azure Monitor posts an alert to `POST /webhook/alert`.
2. `WebhookController` calls `IAlertStorage.SaveAlertAsync(payload)`.
3. `AlertStorage` extracts normalized fields from the payload.
4. `AlertStorage` computes a deduplication key.
5. `incidents.json` update:
   - Existing dedup key: update existing incident (`receivedCount`, `lastReceivedDateTime`).
   - New dedup key: create new incident ID in `CARIAD-YYYY-###` format.
6. `alerts.json` update:
   - Always append a raw alert feed event entry.
   - Link the feed event to the incident ID.
7. `SaveAlertAsync` returns the incident ID to `WebhookController`.
8. `WebhookController` broadcasts `AlertReceived` to SignalR clients.
9. `WebhookController` starts the pipeline asynchronously (`IPipelineOrchestrator.RunAsync`).
10. API responds `202 Accepted` with `incidentId`.

## API Consumption Paths

### Alerts Feed (`/api/alerts`)

- Source: `alerts.json` via `GetAllFeedAlertsAsync()`.
- Characteristics:
  - Event-oriented timeline.
  - Not deduplicated.
  - Filterable by severity, source, status, and search query.

### Incidents (`/api/incidents`)

- Source: `incidents.json` via `GetAllAlertsAsync()`.
- Characteristics:
  - Deduplicated, actionable incident records.
  - Supports search + filters + pagination.
  - Incident detail route loads by incident ID.

## Realtime UI Behavior

1. Frontend subscribes to SignalR hub at `/hubs/incidents`.
2. On `AlertReceived`:
   - Incidents page refetches and highlights the newly added row.
   - Alerts feed refetches and highlights the related event row.
3. Users get immediate visual feedback (badge, highlight, scroll into view).

## Key Backend Components

- `src/backend/AiObservability.Api/Controllers/WebhookController.cs`
- `src/backend/AiObservability.Api/Data/AlertStorage.cs`
- `src/backend/AiObservability.Api/Controllers/AlertsController.cs`
- `src/backend/AiObservability.Api/Controllers/IncidentsController.cs`
- `src/backend/AiObservability.Api/Hubs/IncidentHub.cs`

## Key Frontend Components

- `src/frontend/src/hooks/useIncidentUpdates.ts`
- `src/frontend/src/pages/AlertsFeed.tsx`
- `src/frontend/src/pages/IncidentsList.tsx`
- `src/frontend/src/components/alerts/AlertsTable.tsx`
- `src/frontend/src/components/incidents/IncidentRow.tsx`

## Data Contract Notes

- `alerts.json` is the raw feed source of truth for Alerts Feed.
- `incidents.json` is the deduplicated source of truth for Incidents.
- A single incoming webhook can:
  - append one new feed event,
  - and either create or update one incident.
