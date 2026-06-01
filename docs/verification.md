# Verification

This document covers how to run, test, and verify EvalBench locally and in production.

## Local development

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

### Start the production build

```bash
npm start
```

### Database management

```bash
npx prisma generate        # Generate Prisma Client
npx prisma migrate dev     # Apply local migrations
npx prisma db seed         # Seed mock data
```

## Verifying the app

After `npm run dev` or `npm start`, verify:

1. **Dashboard loads** — visit `http://localhost:3000/` and confirm the stat cards render.
2. **Suites list** — visit `http://localhost:3000/#/suites` and confirm suites are shown.
3. **Suite detail** — click any suite, confirm test cases appear with their inputs and custom assertions.
4. **Assertion Builder** — edit a test case and ensure the UI allows adding/modifying assertion rules.
5. **Run history** — visit `http://localhost:3000/#/runs` and confirm runs are shown.
6. **Run detail** — click any run, confirm assertions, token usage, latency, and regression summary render.
7. **Comparisons** — select multiple runs and view the Provider Comparison report.

## Production verification (Vercel)

The live deployment is at [ai-evaluation-dashboard.vercel.app](https://ai-evaluation-dashboard.vercel.app/).

### Health Check

```bash
curl https://ai-evaluation-dashboard.vercel.app/api/health
```

Expected response:

```json
{"ok":true,"database":"connected","latencyMs":265,"version":"1.0.0"}
```

### Smoke test

```bash
curl -s https://ai-evaluation-dashboard.vercel.app/ | grep -i "<title>"
```

## Database reset

To reset the database to seed data:

```bash
npx prisma migrate reset --force
```

This drops all tables, re-applies migrations, and runs the seed script.

## Manual regression scenarios

To verify regression detection works end-to-end:

1. Open a suite and execute a real or simulated run.
2. Modify the assertion rules to be stricter (e.g. require an output that the model won't provide).
3. Run the suite again.
4. Open the new run. Confirm:
   - Score is lower.
   - At least one regression card is visible in the "Regressions Detected" section.
   - The "Regressions" stat card shows a positive number.
