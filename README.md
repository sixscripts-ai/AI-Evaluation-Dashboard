# EvalBench — AI Evaluation Dashboard

Evaluation dashboard for RAG answers, agent decisions, evidence coverage, assertions, and regression behavior across model runs. EvalBench supports both **simulated runs** (no API keys) and **real model runs** against free-tier-friendly providers: Gemini, Groq, and OpenRouter.

**Live deployment:** [ai-evaluation-dashboard.vercel.app](https://ai-evaluation-dashboard.vercel.app/)

---

## What It Is

EvalBench is a full-stack web application for running and inspecting **evaluation sweeps** against LLM-backed systems. It groups test cases into suites, runs them against a target model/version, scores each result against rule-based assertions, and surfaces regressions across runs.

The app is designed for engineers iterating on RAG pipelines, agent tool-use flows, classification rules, and text extractors who need to verify that model outputs are accurate, evidence-grounded, and within performance SLAs.

---

## What It Does

- **Define eval suites** — group test cases by system type (RAG, agent, classification, extraction, summarization).
- **Run evaluations** — trigger a run in **simulated** mode (deterministic, no keys required) or **real** mode against Gemini, Groq, or OpenRouter.
- **Score results** — each case is scored against assertions (output keywords, evidence matching, latency budget).
- **Detect regressions** — compare each new run to the previous completed run for the same suite. Flag status downgrades, score drops, evidence loss, and latency spikes.
- **Inspect telemetry** — drill into each run to see per-case input, actual output, expected output, evidence match, assertion-level explanations, token usage, and provider latency.
- **Track evidence sources** — reference documents attached to test cases for grounding checks.

---

## Run Modes

EvalBench has two run modes. Both use the same scoring and regression engines.

| Mode | What happens | API keys needed |
|------|--------------|-----------------|
| **Simulated** | Deterministic mock profiles (optimized / average / stale). Used for development, demos, and CI. | None |
| **Real** | Sends the eval prompt to a real provider (Gemini, Groq, or OpenRouter), captures the actual output, and runs the same rule-based assertions. | `GEMINI_API_KEY`, `GROQ_API_KEY`, and/or `OPENROUTER_API_KEY` |

Real runs are capped at **10 active test cases** per request with a **30 second per-case timeout** to keep serverless invocations bounded. Token usage and per-case provider latency are recorded for real runs.

---

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite 6 + Tailwind CSS |
| Backend | Express + Node.js (24.x) |
| Validation | Zod |
| Provider calls | Raw `fetch` (no SDKs) for Gemini, Groq (OpenAI-compatible), OpenRouter (OpenAI-compatible) |
| Persistence | File-based JSON store (`src/db-store.json`) |
| Deployment | Vercel (serverless functions) |

---

## Persistence Model

EvalBench uses a **file-based JSON store** for simplicity. On startup, the server reads `src/db-store.json`. If the file does not exist, it seeds with factory data (3 suites, 12 test cases, evidence sources, runs, and regressions).

On Vercel (serverless), the filesystem is read-only outside `/tmp`, so writes fail silently — the app works against the in-memory state for the lifetime of a warm invocation. For persistent production use, a real database (SQLite, Postgres) should replace the JSON store.

The Settings page provides a **Reset to seed data** action that deletes the local JSON file and re-seeds.

---

## Core Features

- **Evaluation Suites** — Group test cases into cohorts.
- **Test Cases** — Input prompt, expected output, required evidence, difficulty, tags.
- **Simulated Runs** — Trigger runs with a model name, version, and simulation profile.
- **Real Model Runs** — Trigger runs against Gemini, Groq, or OpenRouter; record actual outputs, token usage, and provider latency.
- **Assertion Engine** — Rule-based scoring per result.
- **Regression Detection** — Automatic comparison against the previous run for the same suite.
- **Telemetry Dashboard** — Suite count, pass/partial/fail distribution, average latency, recent runs.
- **Evidence Sources** — Grounding documents attached to test cases.
- **Seed Data Reset** — Restore factory benchmark data.

---

## Assertion Types

| Type | What It Checks |
|------|---------------|
| `outputIncludes` | Does the actual output contain expected keywords? |
| `evidenceIncludes` | Does the output reference the required evidence? |
| `latencyLessThanMs` | Did the response complete within the 1500ms SLA? |

Each assertion produces a pass/fail status with an explanation and the expected vs. actual values. The assertion engine is the same for simulated and real runs.

---

## Regression Detection

A regression is logged when a new run degrades relative to the **previous completed run** for the same suite:

1. **Status downgrade** — PASS → PARTIAL/FAIL, or PARTIAL → FAIL
2. **Score drop** — Score falls by 15+ points
3. **Evidence lost** — `evidenceMatched` goes from `true` to `false`
4. **Latency spike** — Latency rises by 50%+ and exceeds 1000ms

---

## Data Model

- **EvalSuite** — A named group of test cases (e.g. a project or system under test).
- **EvalCase** — An individual test with input, expected output, required evidence, difficulty, and tags.
- **EvidenceSource** — A grounding document attached to a test case (url, note, dataset, code, etc.).
- **EvalRun** — A single evaluation sweep across active cases in a suite. Carries `provider`, `runMode`, `totalInputTokens`, `totalOutputTokens`, `totalTokens`, and `errorMessage`.
- **EvalResult** — The scored outcome of one case within a run. Carries `inputTokens`, `outputTokens`, `totalTokens`, `providerLatencyMs`, and `providerError`.
- **Regression** — A detected degradation between two runs for the same case.

---

## Screenshots

| View | Description |
|------|-------------|
| **Dashboard** | Suite count, assertion status distribution, average latency, recent runs table. |
| **Eval Suites** | Card grid of all suites with case count, run count, and last score. |
| **Suite Detail** | Suite metadata, test cases table, run history table, "Simulate" and "Real Eval" trigger modals. |
| **Run Detail** | Per-case results with expandable assertion details, regression summary, token usage, provider latency, and provider errors. |
| **Evidence Sources** | Grid of grounding documents with search, linked to their test cases. |
| **Regression Report** | Visualized in the Run Detail page when regressions are detected. |

> Screenshots are not yet committed. See the live deployment for current views.

---

## Local Setup

```bash
npm install
cp .env.example .env       # then edit .env to set any keys you want active
npm run dev
```

Opens on `http://localhost:3000`. **No API keys are required to develop the app** — the Simulate button always works.

---

## Real-Eval Provider Setup

To run real evaluations against an external model, set the relevant API key(s) in your environment. The server reads them via `process.env.*` and never returns them to the browser.

```bash
# .env
GEMINI_API_KEY=...         # https://aistudio.google.com/apikey
GROQ_API_KEY=...           # https://console.groq.com/keys
OPENROUTER_API_KEY=...     # https://openrouter.ai/keys

DEFAULT_MODEL_PROVIDER=gemini      # gemini | groq | openrouter
DEFAULT_MODEL_NAME=gemini-2.5-flash
```

On Vercel, set the same variables in **Project Settings → Environment Variables**. The `/api/providers` endpoint exposes only boolean `available` flags, never the keys themselves.

**Default free-tier-friendly models:**

| Provider | Default model | Notes |
|----------|---------------|-------|
| Gemini | `gemini-2.5-flash` | Generous free tier via AI Studio. |
| Groq | `llama-3.1-8b-instant` | Fast, free-tier friendly. |
| OpenRouter | `openai/gpt-oss-20b:free` | Free model — paid models available but not required. |

The provider can be changed at run time from the **Real Eval** modal in the Suite Detail page. Custom model IDs can be entered directly.

---

## How Real Evaluations Work

1. Open a suite with active test cases.
2. Click **Real Eval** (the green button). A modal opens.
3. Pick a provider (the card shows whether the API key is set on the server), pick or type a model, enter a system version, and start.
4. The server builds a deterministic prompt per case: task name, input, target rubric, required evidence, and a `Evidence sources:` block listing excerpts.
5. The server calls the provider with a 30 second per-case timeout.
6. The actual output is scored against the same rule-based assertions used by simulated runs.
7. Per-case results record input tokens, output tokens, total tokens, and provider latency. A failed provider call is recorded as a failed result with `providerError` populated, and the run continues to the next case.
8. The run is stored in the in-memory JSON store. Tokens, latency, and provider errors are visible on the Run Detail page.

---

## Build & Deploy

```bash
npm run build       # builds frontend + bundles server
npm start           # runs the compiled server
```

Deployed via Vercel. The `api/` directory contains the serverless entry point; `vercel.json` handles routing.

---

## Provider Comparison Reports (Milestone 3)

Compare side-by-side RAG sweeps, agents, or models (Gemini, Groq, simulated runs) to understand which provider performs best, fastest, cheapest, and most reliably.

### How to Use
1. Run at least two evaluations for the same suite (either simulated or real runs).
2. Click the **Compare Runs** button in the top right of the Suite Detail page, or click the **⚖️ Compare Suite Runs** shortcut next to the suite in the Runs list.
3. On the comparison page, check the checkboxes for 2–4 completed runs.
4. The dashboard will automatically compute and render comparison summaries, flags, and a case-by-case comparison matrix.

### What is Compared
- **Metadata:** Provider, model name, run mode, completed timestamp, and error warnings.
- **Accuracy Metrics:** Average score, pass count, partial count, and fail count.
- **Performance & Costs:** Average latency (ms), total tokens, and estimated cost (USD) based on standard token pricing.

### Disagreement Detection
The comparison engine automatically runs an analysis sweep over test cases to flag differences between selected models:
- **Status Disagreement:** (High severity) One model passed a case while another completely failed.
- **Score Gap:** (Medium severity) A score gap of &ge; 25% exists between models on the same case.
- **Evidence Mismatch:** (High severity) One model matched all required evidence citations while another failed.
- **Latency Spread:** (Low severity) The slowest model was &ge; 2x slower than the fastest, with at least a 500ms difference.
- **Provider Error:** (High severity) A model failed at runtime while other models completed.

### Winner & Diagnostics Panel
A diagnostic overview highlights:
- **Best Scoring:** Model with the highest average score.
- **Fastest:** Model with the lowest average response latency.
- **Most Reliable:** Model with the lowest failed cases and error rate.
- **Most Consistent:** Model with the lowest variance in scores.
- **Cases Needing Review:** Cases flagged with Medium or High severity disagreements.

### Exporting Reports
Click **Copy Markdown** to copy a beautifully formatted Markdown report containing all comparative data, diagnostics, disagreements, and tables to your clipboard. Click **JSON Download** to download the structured comparison data for integration into other dashboards.

---

## Known Limitations (v1.2)

- **Comparison is run-level, not statistical benchmarking.** Compares specific runs rather than multiple trials for statistical significance.
- **Cost and token usage may be unavailable depending on provider.** If provider doesn't report usage, it displays "not reported" rather than faking values.
- **Real runs are capped at 10 cases per request.** Truncation is recorded on the run summary modal and the response payload.
- **30 second per-case timeout.** A single hung provider call does not block the whole run — it is recorded as a failed result and the run continues.
- **Keyword-based assertions only.** The same rule engine is used for both simulated and real runs; there is no LLM-as-judge yet.
- **Token counts depend on provider response shape.** Gemini and OpenRouter-compatible providers return explicit `usage`; OpenAI-compatible providers without usage reporting will record `n/a`.
- **No retries.** A failed call is logged once; the run continues.
- **No authentication.** Single-user sandbox. No multi-tenant isolation.
- **File-based persistence.** JSON store does not survive cold starts in serverless environments. For production, replace with a real database.
- **No scheduled evals yet.**
- **No streaming.** Runs are synchronous and complete in a single request.
- **No export/import.** Suite definitions cannot be exported or imported as files.

---

## Security

- API keys are **server-side only**. They are read via `process.env.*` inside `src/lib/model-providers/*.ts`.
- The `/api/providers` endpoint exposes only `available: boolean` per provider — never the key material.
- The client bundle never contains `process.env.GEMINI_API_KEY`, `process.env.GROQ_API_KEY`, or `process.env.OPENROUTER_API_KEY`. Real provider calls are made from the serverless API route, not the browser.
- The Vercel dashboard should be the only place real keys live in production. `.env.example` contains only placeholders.

---

## Next Milestone

- LLM-as-judge assertion mode.
- Persistent database (SQLite or Postgres).
- User-defined custom assertions (regex, JSON schema, semantic similarity).
- Export / import suite definitions as JSON.
- Authentication and multi-user support.

---

## Documentation

- [docs/architecture.md](docs/architecture.md) — System architecture and data flow.
- [docs/scoring.md](docs/scoring.md) — Scoring, assertions, and regression detection logic.
- [docs/verification.md](docs/verification.md) — How to run, test, and verify the app locally.
