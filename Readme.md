# AI Observability Platform

## Prerequisites

- [.NET 10 SDK](https://dotnet.microsoft.com/download/dotnet/10.0)
- [Node.js 18+](https://nodejs.org/)

## Running the Backend

```powershell
cd src/backend/AiObservability.Api
dotnet run --urls "http://localhost:5000"
```

- API: `http://localhost:5000`
- Scalar API docs: `http://localhost:5000/scalar`
- OpenAPI spec: `http://localhost:5000/openapi/v1.json`
- Login: any email, password `demo`

## Running the Frontend

```powershell
cd src/frontend
npm install
$env:VITE_USE_BACKEND="true"
npm run dev
```

Open `http://localhost:5270`. The dev server proxies `/api/*` to the backend.

> To use MSW mocks instead of the real backend, omit the `VITE_USE_BACKEND` env var.

## Docker (Backend)

```powershell
cd src/backend
docker build -t ai-observability-api .
docker run -p 5000:5000 ai-observability-api
```

## Docs

- Alert to incident workflow: `docs/alert-to-incident-workflow.md`



We should check:
https://incident.io/



claude --resume 13fb9a4c-77f9-469e-95bb-4562b0340725# AI-Observability
