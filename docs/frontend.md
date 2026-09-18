# AIOps Platform — Frontend

React SPA for the AIOps observability platform. Visualises incidents, RCA results, alerts, pipeline runs, and integrations using mocked data (MSW). No backend connection required to run.

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | 18 or later |
| npm | 9 or later |

Check your versions:

```bash
node -v
npm -v
```

## Quick start

```bash
# 1. Navigate to the frontend directory
cd src/frontend

# 2. Install dependencies
npm install

# 3. Initialise the MSW service worker (first time only)
npx msw init public/ --save

# 4. Start the dev server
npm run dev
```

Open **http://localhost:5270** in your browser.

**Login credentials (demo only):**
- Email: `cluster@reply.de`
- Password: `ClusterReply2026!`

## Available scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server with HMR at `localhost:5270` |
| `npm run build` | Production build — output in `dist/` |
| `npm run preview` | Serve the production build locally |

## Project structure

```
src/frontend/
├── public/
│   └── mockServiceWorker.js   # MSW service worker (generated)
└── src/
    ├── api/                   # TanStack Query hooks per resource
    ├── components/
    │   ├── layout/            # Sidebar, Topbar, Layout, ProtectedRoute
    │   ├── common/            # Shared UI (badges, breadcrumbs, skeletons, …)
    │   ├── dashboard/         # KPI cards, charts
    │   ├── incidents/         # RCA, evidence, reasoning, enrichment
    │   ├── alerts/            # Table and filters
    │   └── sources/           # Integration health cards
    ├── contexts/              # AuthContext, ThemeContext
    ├── hooks/                 # useAuth, useTheme, useLocalStorage
    ├── mocks/
    │   ├── browser.ts         # MSW worker setup
    │   ├── handlers.ts        # REST endpoint handlers
    │   └── fixtures/          # Static mock data (incidents, alerts, …)
    ├── pages/                 # One file per route
    ├── routes/                # AppRoutes.tsx — route table
    ├── styles/
    │   ├── tokens.scss        # Design tokens (colours, spacing, typography)
    │   └── bootstrap.scss     # Bootstrap overrides + component styles
    └── types/                 # TypeScript interfaces mirroring backend models
```

## Routes

| Path | Page |
|------|------|
| `/login` | Login screen |
| `/dashboard` | KPI overview, charts, source health |
| `/incidents` | Incident list with filters |
| `/incidents/:id` | Incident detail — RCA, evidence, enrichment |
| `/alerts` | Alert feed with filters |
| `/sources` | Integration health cards |
| `/analytics` | MTTR trends, SLA table, incidents by service |
| `/costs` | Query cost breakdown and FinOps charts |
| `/pipeline` | LangGraph pipeline run history |
| `/agents` | AI agent cards (Signal Aggregator → GitHub Issue Creator) |
| `/knowledge` | Runbooks accordion |
| `/services` | SVG service dependency map |
| `/settings` | Profile, integrations, notifications, AI config |

## Mock API

All data is served by **MSW v2** — no backend needed. The service worker intercepts every `/api/*` request and returns fixture data with a 350 ms simulated delay.

Endpoints:

```
GET  /api/dashboard
GET  /api/incidents          ?severity= &source= &q=
GET  /api/incidents/:id
GET  /api/alerts             ?severity= &source= &status=
GET  /api/sources
GET  /api/analytics
GET  /api/costs
GET  /api/pipeline/runs
GET  /api/knowledge/runbooks ?q=
GET  /api/services
GET  /api/agents
POST /api/login
POST /api/logout
```

To add or modify mock data edit the files in `src/mocks/fixtures/`.

## Dark mode

Toggle via the sun/moon icon in the topbar, or change it in **Settings → Profile → Appearance**. The preference is saved to `localStorage` and persists across reloads.

## Connecting to the real backend

When the backend API is running, remove the MSW bootstrap from `src/main.tsx`:

```ts
// Remove or gate this block:
if (import.meta.env.DEV) {
  const { worker } = await import('./mocks/browser');
  await worker.start({ ... });
}
```

All data fetching uses `apiFetch` in `src/api/client.ts` which calls `/api/*` relative URLs — no base URL change needed as long as the backend serves on the same origin or a proxy is configured in `vite.config.ts`.

## Troubleshooting

**Port 5270 already in use**

```bash
# Find and kill the process using the port (Windows)
netstat -ano | findstr :5270
taskkill /PID <pid> /F
```

If the port is in `TIME_WAIT` (no active process), Vite will automatically try the next free port since `strictPort` is set to `false`.

**"Unexpected token '<'" JSON error**

This means a request hit a route with no MSW handler and received the Vite HTML fallback. Check that `mockServiceWorker.js` is present in `public/` (run `npx msw init public/ --save`) and that the browser console shows `[MSW] Mocking enabled`.

**Sass deprecation warnings**

These come from Bootstrap's legacy Sass API and are silenced in `vite.config.ts`. They do not affect functionality.
