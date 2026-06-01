# Architecture

EvalBench is a single-tenant full-stack web application built as a Vercel serverless deployment. It has three runtime layers:

1. **Client** — React 19 SPA bundled by Vite 6, served as static assets.
2. **Server** — Express app on Node.js 24, deployed as a Vercel serverless function at `/api`.
3. **Storage** — A file-based JSON store on disk (`src/db-store.json`).

## Component diagram

```
┌──────────────────┐         ┌────────────────────┐         ┌────────────────────┐
│  React Client    │   HTTP  │  Express Server    │  fs API │  JSON Store        │
│  (Vite bundle)   │ ◀────▶  │  (Vercel function) │ ◀────▶  │  (db-store.json)   │
└──────────────────┘  /api/* └────────────────────┘         └────────────────────┘
       │                          │
       │                          ▼
       │                  ┌────────────────────┐
       │                  │  Scoring Engine    │
       │                  │  (simulated runs)  │
       │                  └────────────────────┘
       ▼
  ┌──────────────────┐
  │  Browser Router  │
  │  (hash-based)    │
  └──────────────────┘
```

## Request flow

1. The browser loads the static React client from `/`.
2. The client uses `fetch('/api/...')` for all data operations.
3. Vercel's catch-all rewrite (`vercel.json`) routes `/api/*` to the serverless function in `api/index.ts`.
4. The server validates input with Zod, reads/writes the JSON store, and returns JSON.
5. On startup the server ensures `db-store.json` exists. If not, it seeds it from `src/db.ts` factory data.

## Client routing

The client uses a hash-based router implemented in `src/App.tsx`. Routes are matched against patterns like `/suites/:id`, `/runs/:id`, `/cases/:id`. This avoids requiring server-side routing rules for the SPA.

## Data model

The JSON store contains:

- `evalSuites` — array of `EvalSuite`
- `evalCases` — array of `EvalCase`
- `evidenceSources` — array of `EvidenceSource`
- `evalRuns` — array of `EvalRun`
- `evalResults` — array of `EvalResult` (joined with `EvalCase` for display)
- `regressions` — array of `Regression`

Each top-level entity has a unique `id`. Suites reference test cases via `EvalCase.suiteId`. Runs reference suites via `EvalRun.suiteId` and store their results separately in `evalResults` keyed by `runId`.

## Serverless constraints

- **Filesystem is read-only** outside `/tmp` on Vercel. The JSON store is loaded into memory at cold start and re-persisted to disk on writes.
- **Cold starts** may lose data if the in-memory state is not flushed to disk before the function freezes.
- **No streaming** — runs complete in a single request cycle. Runs in this build are simulated and complete in <1s.
- **Single instance** — there is no shared state across invocations. For multi-instance production use, replace the JSON store with a real database.

## File layout

```
.
├── api/
│   └── index.ts          # Vercel serverless entry
├── src/
│   ├── App.tsx           # Root React component, hash router
│   ├── app.ts            # Express app definition
│   ├── scoring.ts        # Assertion engine and regression detection
│   ├── db.ts             # Seed data and JSON store helpers
│   ├── db-store.json     # Persisted state (generated)
│   ├── components/       # React components (Dashboard, SuitesList, etc.)
│   ├── types.ts          # TypeScript type definitions
│   └── ...
├── server.ts             # Local dev entry (Vite middleware + Express)
├── vite.config.ts        # Vite build configuration
├── vercel.json           # Vercel routing and build config
└── package.json          # Dependencies and scripts
```
