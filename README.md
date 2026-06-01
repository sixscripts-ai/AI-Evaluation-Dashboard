# EvalBench — AI Evaluation Dashboard

AI evaluation dashboard for provider comparisons, custom assertions, regressions, and evidence-backed model outputs.

EvalBench is a full-stack web application for running and inspecting **evaluation sweeps** against LLM-backed systems. It groups test cases into suites, runs them against a target model/version, scores each result against custom assertion rules, and surfaces regressions across runs.

**Live deployment:** [ai-evaluation-dashboard.vercel.app](https://ai-evaluation-dashboard.vercel.app/)

---

## Current Feature List

- **Evaluation Suites** — Group test cases into cohorts (RAG, agent, classification, extraction, summarization).
- **Test Cases** — Configurable inputs, expected outputs, required evidence, and assertions.
- **Run Modes**:
  - **Simulated Mode**: Deterministic fallback runs without API keys. Used for fast testing and CI.
  - **Real Provider Runs**: Sends prompts directly to real providers.
- **Supported Providers**: Gemini, Groq, and OpenRouter (OpenAI-compatible).
- **Provider Comparison Reports** — Side-by-side comparison of multiple runs to identify the fastest, most reliable, and highest scoring models. Includes automatic disagreement detection (e.g. status downgrades, score gaps, latency spikes).
- **Custom Assertion Builder** — Visual UI to configure testing rules without code changes.
- **Assertion Templates** — Build tests using 10 different assertion types, from exact matching to latency checks.
- **Assertion Result Scoring** — Dynamic rule-based scoring calculated from assertion outcomes.
- **Regression Detection** — Automatic comparison against previous runs for the same suite.
- **Evidence Sources** — Anchor documents attached to test cases for grounding validations.

---

## Technical Stack

- **Frontend:** React + Vite + Tailwind CSS
- **Backend:** Express + Node
- **Validation:** Zod
- **Persistence:** Neon Postgres with Prisma ORM
- **Model Providers:** Gemini, Groq, OpenRouter
- **Evaluation:** deterministic assertion rules + regression checks

---

## Screenshots

<!-- Add screenshots to the repo and replace the links below -->

### Dashboard
![Dashboard Screenshot Placeholder](docs/images/dashboard.png)
*Provides suite count, assertion status distribution, average latency, and recent runs table.*

### Suite Detail
![Suite Detail Screenshot Placeholder](docs/images/suite-detail.png)
*Shows suite metadata, test cases table, run history, and trigger modals.*

### Assertion Builder
![Assertion Builder Screenshot Placeholder](docs/images/assertion-builder.png)
*Visual interface for defining custom rules and evaluation criteria.*

### Run Detail
![Run Detail Screenshot Placeholder](docs/images/run-detail.png)
*Displays per-case results with assertion explanations, regression summaries, token usage, and latency.*

### Provider Comparison Report
![Provider Comparison Report Screenshot Placeholder](docs/images/provider-comparison.png)
*Side-by-side analysis of model performance, cost, and disagreements.*

---

## Run Modes & Provider Setup

EvalBench supports both **simulated runs** and **real model runs**. The same evaluation logic and custom assertion rules apply to both.

### Environment Variables

To run real evaluations against an external model, set the relevant API key(s) in your `.env` file or Vercel Project Settings. The server reads them via `process.env.*` and never returns them to the browser.

```bash
# .env
GEMINI_API_KEY=...         # https://aistudio.google.com/apikey
GROQ_API_KEY=...           # https://console.groq.com/keys
OPENROUTER_API_KEY=...     # https://openrouter.ai/keys

DEFAULT_MODEL_PROVIDER=gemini      # gemini | groq | openrouter
DEFAULT_MODEL_NAME=gemini-2.5-flash

DATABASE_URL=...           # Pooled connection (Neon) or local postgres://
DIRECT_URL=...             # Direct connection (Neon) or same as DATABASE_URL
```

---

## Data Model

EvalBench uses the following primary concepts to represent evaluations:

- **EvalSuite**: A named group of test cases (e.g. a project or system under test).
- **EvalCase**: An individual test containing the input, expected output, and a list of assertions.
- **AssertionRule**: A specific test criterion applied to a test case (e.g. `outputIncludes`, `latencyLessThanMs`). Replaces old hardcoded heuristics with configurable targets.
- **AssertionTemplate**: Reusable UI concepts representing different assertion types and input fields.
- **AssertionResult**: The pass/fail outcome and explanation of an `AssertionRule` applied to actual model output.
- **EvalRun**: A single evaluation sweep across active cases in a suite. 
- **EvalResult**: The scored outcome of one case within a run, containing an array of `AssertionResult`s.
- **Regression**: A detected degradation between two runs for the same case.

---

## Local Setup & Deployment

### Local Setup

```bash
# Prerequisites: Node.js 18+, a local Postgres database
createdb evalbench                        # Create local database
npm install
cp .env.example .env                      # Edit to set API keys and DB URLs
npm run db:generate                        # Generate Prisma Client
npm run db:migrate                         # Apply migrations (creates tables)
npm run db:seed                            # Seed initial mock data
npm run dev
```
The app opens on `http://localhost:3000`. **No API keys are required to develop the app** — simulated mode works completely offline.

### Production Deployment (Neon + Vercel)

**1. Neon Postgres Setup**
- Create a project on [Neon](https://neon.tech/).
- Copy the **Pooled connection string** → `DATABASE_URL`  
  e.g. `postgresql://user:pass@ep-xxxx-pooler.us-east-2.aws.neon.tech/neondb?pgbouncer=true&connection_limit=1`
- Copy the **Direct connection string** → `DIRECT_URL`  
  e.g. `postgresql://user:pass@ep-xxxx.us-east-2.aws.neon.tech/neondb`

**2. Vercel Setup**
- Import the repository into Vercel.
- Add `DATABASE_URL` and `DIRECT_URL` to **Vercel Environment Variables** (Production).
- Add your provider API keys (`GEMINI_API_KEY`, etc.).
- Set framework preset to **Vite** (build command: `npm run build`, output: `dist`).
- Deploy.

**3. Database Migration & Seeding**
Serverless environments don't run Prisma migrations automatically. Run them locally with production env vars:

```bash
# Apply migrations to production
DATABASE_URL="<direct-url>" npx prisma migrate deploy

# Seed the production database
DATABASE_URL="<direct-url>" npx prisma db seed
```

> Use the **direct** connection string for migrations and the **pooled** one for runtime queries (PrismaPg handles pooling automatically).

**4. Verification**
- Visit `/api/health` on your deployed app. It returns `{"ok": true, "database": "connected", "latencyMs": 15}`.

### Prisma 7 Notes

This project uses **Prisma 7** with a **driver adapter** (`@prisma/adapter-pg`). Key differences from Prisma 6:

- **No `url`/`directUrl` in `schema.prisma`** — connection configuration lives in `prisma.config.ts`.
- **PrismaClient requires an adapter** at runtime (`PrismaPg`). This is set up in `src/lib/db.ts`.
- **Seed config** lives in `prisma.config.ts` under `migrations.seed`, not in `package.json`.
- Use `prisma migrate dev` for local development and `prisma migrate deploy` for production.

---

## Known Limitations

- **Single-user sandbox:** No authentication or multi-tenant isolation.
- **Keyword-based assertions only:** Currently relies on deterministic rules; no LLM-as-judge yet.
- **Comparison is run-level, not statistical benchmarking.**
- **No scheduled evals yet.**
- **No export/import of suites.**

---

## Next Milestones

- LLM-as-judge assertion mode.
- Export / import suite definitions as JSON.
- Authentication and multi-user support.

---

## Documentation

- [Architecture](docs/architecture.md)
- [Assertions](docs/assertions.md)
- [Provider Runs](docs/provider-runs.md)
- [Comparisons](docs/comparisons.md)
- [Verification](docs/verification.md)
