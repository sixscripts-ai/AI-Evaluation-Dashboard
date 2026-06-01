# Architecture

EvalBench is a single-tenant full-stack web application built as a Vercel serverless deployment. It has three runtime layers:

1. **Client** — React 19 SPA bundled by Vite 6, served as static assets.
2. **Server** — Express app on Node.js 24, deployed as a Vercel serverless function at `/api`.
3. **Storage** — Neon Postgres accessed through Prisma ORM with the `@prisma/adapter-pg` driver adapter.

## Component diagram

```
┌──────────────────┐         ┌────────────────────┐         ┌────────────────────┐
│  React Client    │   HTTP  │  Express Server    │ Prisma  │  Neon Postgres     │
│  (Vite bundle)   │ ◀────▶  │  (Vercel function) │ ◀────▶  │  (Prisma ORM)      │
└──────────────────┘  /api/* └────────────────────┘         └────────────────────┘
       │                          │
       │                          ▼
       │                  ┌────────────────────┐
       │                  │  Providers / Score │
       │                  │  (Gemini, Groq,    │
       │                  │   OpenRouter)      │
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
3. Vercel's catch-all rewrite routes `/api/*` to the serverless function in `api/index.ts`.
4. The server validates input with Zod, communicates with model providers, runs the assertion engine, reads/writes Postgres via Prisma, and returns JSON.
5. On cold start the server connects to Postgres through PrismaPg. Migrations are applied separately via `prisma migrate deploy`.

## Client routing

The client uses a hash-based router implemented in `src/App.tsx`. Routes are matched against patterns like `/suites/:id`, `/runs/:id`, `/cases/:id`. This avoids requiring server-side routing rules for the SPA.

## Data model

The database schema is managed by Prisma and contains these core entities:

- `EvalSuite` — named group of test cases
- `EvalCase` — individual test with custom `AssertionRule`s (stored as JSON)
- `EvidenceSource` — anchor documents attached to cases
- `EvalRun` — a single evaluation sweep
- `EvalResult` — scored outcome of one case within a run
- `Regression` — detected degradation between two runs

Each entity has a unique `id`. Suites reference cases via `suiteId`. Runs reference suites via `suiteId` and store results keyed by `runId`.

## Serverless constraints

- **Cold starts** occur when the Vercel function hasn't been invoked recently. Postgres connections via PrismaPg are established on first request.
- **Concurrent runs** are handled within a single serverless invocation — real provider runs are capped at 10 cases per request to stay within execution limits.

## File layout

```
.
├── api/
│   └── index.ts          # Vercel serverless entry
├── prisma/
│   ├── schema.prisma     # Database schema
│   ├── seed.ts           # Seed data
│   └── config.ts         # Prisma config (connection, migrations)
├── src/
│   ├── App.tsx           # Root React component, hash router
│   ├── app.ts            # Express app definition
│   ├── scoring.ts        # Assertion engine and regression detection
│   ├── lib/
│   │   ├── db.ts         # Prisma client setup (PrismaPg adapter)
│   │   ├── providers/    # Provider implementations (Gemini, Groq, OpenRouter)
│   │   └── comparison/   # Provider comparison engine
│   ├── components/       # React components
│   ├── types.ts          # TypeScript type definitions
│   └── ...
├── server.ts             # Local dev entry (Vite middleware + Express)
├── vite.config.ts        # Vite build configuration
└── package.json          # Dependencies and scripts
```
