# EvalBench — AI Evaluation Dashboard

AI evaluation dashboard for provider comparisons, custom assertions, regressions, and evidence-backed model outputs.

**Live deployment:** [ai-evaluation-dashboard.vercel.app](https://ai-evaluation-dashboard.vercel.app/)

---

## What it is

EvalBench is a full-stack web application for running and inspecting **evaluation sweeps** against LLM-backed systems. It groups test cases into suites, runs them against a target model/version, scores each result against custom assertion rules, and surfaces regressions across runs.

Persistence is via **Prisma ORM + Postgres**. [Neon](https://neon.tech/) is the recommended hosted provider. Local development uses a local Postgres instance.

---

## How it works

EvalBench orchestrates evaluation pipelines by linking test data with execution engines and scoring logic:
1. **Define Test Cases**: Users author `EvalCase` records containing inputs, expected outputs, and `AssertionRule` thresholds.
2. **Execute Sweep**: The `EvalRun` engine streams the inputs to the selected model provider (Gemini, Groq, OpenRouter) or falls back to a deterministic simulated response.
3. **Score & Validate**: The system evaluates the model's actual output against the predefined assertions (e.g., `regexMatch`, `latencyLessThanMs`).
4. **Detect Regressions**: Results are compared against the previous baseline run to automatically flag score drops, status downgrades, or latency spikes.

---

## Architecture

```mermaid
graph TD
    UI[React Frontend UI] -->|REST API| API[Express Backend API]
    
    API --> DB[(Neon Postgres DB)]
    DB -->|Prisma ORM| API
    
    API --> Runner[Evaluation Runner]
    
    Runner -->|Simulated| Sim[Deterministic Simulator]
    Runner -->|Real Provider| Models[LLM Providers]
    
    Models --> Gemini[Gemini API]
    Models --> Groq[Groq API]
    Models --> OR[OpenRouter API]
    
    Runner --> Scorer[Assertion Scorer]
    Scorer --> Rules[Regex, Latency, Extraction Logic]
    
    Scorer --> Regression[Regression Engine]
    Regression --> DB
```

---

## Demo & Screenshots

[Watch 60-90s Demo Video](docs/demo/evalbench-demo.mp4)

### Dashboard
![Dashboard](docs/images/dashboard.png)
*Provides suite count, assertion status distribution, average latency, and recent runs table.*

### Suite Detail
![Suite Detail](docs/images/suite-detail.png)
*Groups test cases, expected outputs, required evidence, and scoring rules for a specific AI workflow.*

### Assertion Builder
![Assertion Builder](docs/images/assertion-builder.png)
*Visual interface for defining custom rules and evaluation criteria.*

### Run Detail
![Run Detail](docs/images/run-detail.png)
*Result storing the model output, score, pass/partial/fail status, assertion evidence, and regression signals.*

### Provider Comparison
![Provider Comparison Report](docs/images/provider-comparison.png)
*Side-by-side analysis of model performance, cost, and disagreements.*

---

## Current features

- **Eval Suites** — Group test cases into named cohorts.
- **Eval Cases** — Configurable inputs, expected outputs, required evidence, and custom assertions.
- **Evidence Sources** — Anchor documents attached to test cases for grounding validation.
- **Simulated Runs** — Deterministic fallback using rule-based profiles. No API keys required.
- **Real Provider Runs** — Sends prompts to real LLM providers (Gemini, Groq, OpenRouter).
- **Custom Assertions** — Visual Assertion Builder UI to define test rules without code changes.
- **Assertion Templates** — 10 assertion types: `outputIncludes`, `outputExcludes`, `exactMatch`, `regexMatch`, `evidenceIncludes`, `evidenceMissing`, `classificationEquals`, `jsonFieldEquals`, `scoreAtLeast`, `latencyLessThanMs`.
- **Provider Comparison Reports** — Side-by-side comparison of multiple runs with automatic disagreement detection (status downgrades, score gaps, latency spikes, evidence mismatches).
- **Regression Detection** — Automatic comparison against the previous completed run for the same suite. Detects score drops, status downgrades, evidence loss, and latency spikes.

---

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite 6, Tailwind CSS |
| Backend | Express, Node.js |
| Language | TypeScript |
| ORM | Prisma 7 (with `@prisma/adapter-pg`) |
| Database | Postgres / Neon |
| Validation | Zod |
| Deployment | Vercel (serverless) |
| Providers | Gemini, Groq, OpenRouter |

---

## Data model

- **EvalSuite** — A named group of test cases representing a project or system under test.
- **EvalCase** — An individual test with input, expected output, required evidence, and a list of custom `AssertionRule`s.
- **EvidenceSource** — A document or reference attached to a case for evidence-grounded evaluation.
- **EvalRun** — A single evaluation sweep across active cases in a suite.
- **EvalResult** — The scored outcome of one case within a run, containing scored `AssertionResult`s.
- **Regression** — A detected degradation between two runs for the same case (status downgrade, score drop, evidence loss, or latency spike).
- **AssertionTemplate** — Reusable UI concept representing different assertion types and their input fields.

---

## Environment variables

```bash
DATABASE_URL=              # Pooled connection (Neon) or local postgres://
DIRECT_URL=                # Direct connection (Neon) or same as DATABASE_URL
GEMINI_API_KEY=            # https://aistudio.google.com/apikey
GROQ_API_KEY=              # https://console.groq.com/keys
OPENROUTER_API_KEY=        # https://openrouter.ai/keys
DEFAULT_MODEL_PROVIDER=gemini
DEFAULT_MODEL_NAME=gemini-2.5-flash
```

---

## Local setup

```bash
# Prerequisites: Node.js 18+, Postgres running locally
createdb evalbench
npm install
cp .env.example .env           # Edit to set DATABASE_URL, DIRECT_URL, and API keys
npx prisma generate
npx prisma migrate dev
npx prisma db seed
npm run dev
```

The app opens on `http://localhost:3000`. No API keys are required — simulated mode works completely offline.

---

## Production setup with Neon + Vercel

### 1. Neon Postgres

- Create a project on [Neon](https://neon.tech/).
- **Pooled connection string** → `DATABASE_URL`  
  `postgresql://user:pass@ep-xxxx-pooler.us-east-2.aws.neon.tech/neondb?pgbouncer=true&connection_limit=1`
- **Direct connection string** → `DIRECT_URL`  
  `postgresql://user:pass@ep-xxxx.us-east-2.aws.neon.tech/neondb`

### 2. Vercel

- Import the repo into Vercel.
- Add all environment variables in **Project Settings → Environment Variables** (Production).
- Deploy. The build runs `prisma generate` automatically via the `postinstall` hook.

### 3. Database Migration & Seeding

Serverless environments don't run Prisma migrations automatically. Run locally with production env vars:

```bash
# Apply migrations
DATABASE_URL="<direct-url>" npx prisma migrate deploy

# Seed the production database
DATABASE_URL="<direct-url>" npx prisma db seed
```

Use the **direct** connection for migrations and the **pooled** one for runtime queries.

### 4. Verification

```bash
curl https://your-app.vercel.app/api/health
```

Returns `{"ok":true,"database":"connected","latencyMs":265,"version":"1.0.0"}`.

---

## Verification

```bash
npm run build
npx prisma generate
npx prisma migrate dev     # Local development
npx prisma db seed         # Seed mock data
npm run dev                # Start dev server
```

---

## Known limitations

- **No authentication** — single-user sandbox, no multi-tenant isolation.
- **No teams / workspaces** — all data is flat, no org separation.
- **No scheduled evals** — runs are manual only.
- **No AI judge / rubric scoring** — assertions are deterministic rules only (for now).
- **Provider rate limits** — real runs depend on external API availability and quotas.

---

## Documentation

- [Architecture](docs/architecture.md)
- [Assertions](docs/assertions.md)
- [Provider Runs](docs/provider-runs.md)
- [Comparisons](docs/comparisons.md)
- [Verification](docs/verification.md)
