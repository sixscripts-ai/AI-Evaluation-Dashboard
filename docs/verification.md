# Verification

This document covers how to run, test, and verify EvalBench locally and in production.

## Local development

### Prerequisites

- Node.js 20.x or 24.x
- npm 10+

### Setup

```bash
npm install
```

### Run dev server

```bash
npm run dev
```

This starts:
- Vite dev server on `http://localhost:3000` (with HMR)
- Express server on the same port via Vite middleware

The app is fully functional in dev mode. Hot reload works for the React client; the Express server restarts on changes to `src/app.ts` or `src/scoring.ts`.

### Build for production

```bash
npm run build
```

This runs:
1. `vite build` — produces the client bundle in `dist/`
2. `esbuild` — bundles the server into `dist/server.cjs`

Expected output: client bundle + server bundle, with two harmless warnings about `import.meta` in CJS (handled by a runtime fallback in `db.ts`).

### Start the production build

```bash
npm start
```

This runs `node dist/server.cjs`. The server reads `dist/db-store.json` if present; otherwise it seeds from `src/db.ts`.

## Verifying the app

### Manual verification checklist

After `npm run dev` or `npm start`, the following should all work:

1. **Dashboard loads** — visit `http://localhost:3000/` and confirm the 4 stat cards render with non-zero values.
2. **Suites list** — visit `http://localhost:3000/#/suites` and confirm 3 baseline suites are shown.
3. **Suite detail** — click any suite, confirm 4 test cases appear with their inputs and assertions.
4. **Run history** — visit `http://localhost:3000/#/runs` and confirm 6 runs are shown (2 per suite).
5. **Run detail** — click any run, confirm assertions, evidence status, and regression summary render.
6. **Evidence sources** — visit `http://localhost:3000/#/sources` and confirm sources are searchable.
7. **Settings reset** — visit `http://localhost:3000/#/settings`, click "Reset to Seed Data", confirm redirect to dashboard with the same 3 suites and 6 runs.

### API verification

The Express server exposes the following endpoints:

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/health` | Health check |
| GET | `/api/suites` | List all suites with case/run counts |
| GET | `/api/suites/:id` | Suite detail with cases and runs |
| POST | `/api/suites` | Create a new suite |
| GET | `/api/cases` | List all test cases |
| GET | `/api/cases/:id` | Case detail |
| POST | `/api/cases` | Create a new test case |
| GET | `/api/sources` | List all evidence sources |
| POST | `/api/sources` | Add an evidence source |
| GET | `/api/runs` | List all runs |
| GET | `/api/runs/:id` | Run detail with results and regressions |
| POST | `/api/runs` | Trigger a new run |
| POST | `/api/settings/reset` | Reset the JSON store to seed data |

Verify with curl:

```bash
curl http://localhost:3000/api/health
# {"status":"ok","timestamp":"..."}

curl http://localhost:3000/api/suites | head -c 200
# [{"id":"suite-001","name":"...",...},...]

curl -X POST http://localhost:3000/api/runs \
  -H "Content-Type: application/json" \
  -d '{"suiteId":"suite-001","modelName":"gemini-2.5-flash","systemVersion":"v1.0.0","profile":"average"}'
# {"runId":"run-...","averageScore":75,"regressionCount":2,...}
```

## Production verification (Vercel)

The live deployment is at [ai-evaluation-dashboard.vercel.app](https://ai-evaluation-dashboard.vercel.app/).

### Deployment health

```bash
curl https://ai-evaluation-dashboard.vercel.app/api/health
# {"status":"ok","timestamp":"..."}
```

### Smoke test

After each deploy, the Vercel deployment logs and the health endpoint should both return successfully. The home page should return HTML with `<title>EvalBench — AI Evaluation Dashboard</title>`.

```bash
curl -s https://ai-evaluation-dashboard.vercel.app/ | grep -i "<title>"
# <title>EvalBench — AI Evaluation Dashboard</title>
```

## Test data reset

If the local JSON store gets into a bad state, run:

```bash
rm src/db-store.json
npm start
```

Or use the in-app Settings page → "Reset to Seed Data" button.

## Common issues

### "ECONNREFUSED" on the API

The Express server failed to start. Check the terminal output for errors. Common causes:
- Port 3000 is already in use — set `PORT=3001` and restart.
- `db-store.json` is corrupted — delete it and restart.

### Stale UI after editing components

Vite HMR should pick up changes automatically. If not, hard-refresh the browser (Cmd+Shift+R on macOS).

### "Failed to fetch" on the dashboard

The API is unreachable. Check the browser dev tools Network tab for the failing request URL. If the URL is `/api/...` and the status is 404, the Express route is missing or `vercel.json` is misconfigured.

## Manual regression scenarios

To verify regression detection works end-to-end:

1. Open a suite and run an evaluation with the **optimized** profile.
2. Note the average score and regression count.
3. Run the same suite again with the **stale** profile.
4. Open the new run. Confirm:
   - Score is lower than the optimized run.
   - At least one regression card is visible in the "Regressions Detected" section.
   - The "Regressions" stat card shows a positive number.

## Limitations of this verification

The current build uses simulated scoring, so regressions are deterministic. With real LLM integration, regressions would be non-deterministic and require multiple runs to assess variance.
