# EvalBench — AI Evaluation Dashboard

Evaluation dashboard for RAG answers, agent decisions, evidence coverage, assertions, and regression behavior across model runs.

**Live deployment:** [ai-evaluation-dashboard.vercel.app](https://ai-evaluation-dashboard.vercel.app/)

---

## What It Is

EvalBench is a full-stack web application for running and inspecting **evaluation sweeps** against LLM-backed systems. It groups test cases into suites, runs them against a target model/version, scores each result against rule-based assertions, and surfaces regressions across runs.

The app is designed for engineers iterating on RAG pipelines, agent tool-use flows, classification rules, and text extractors who need to verify that model outputs are accurate, evidence-grounded, and within performance SLAs.

---

## What It Does

- **Define eval suites** — group test cases by system type (RAG, agent, classification, extraction, summarization).
- **Run evaluations** — trigger a run against a named model and version, with a simulation profile.
- **Score results** — each case is scored against assertions (output keywords, evidence matching, latency budget).
- **Detect regressions** — compare each new run to the previous completed run for the same suite. Flag status downgrades, score drops, evidence loss, and latency spikes.
- **Inspect telemetry** — drill into each run to see per-case input, actual output, expected output, evidence match, and assertion-level explanations.
- **Track evidence sources** — reference documents attached to test cases for grounding checks.

---

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite 6 + Tailwind CSS |
| Backend | Express + Node.js (24.x) |
| Validation | Zod |
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

Each assertion produces a pass/fail status with an explanation and the expected vs. actual values.

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
- **EvalRun** — A single evaluation sweep across all active cases in a suite.
- **EvalResult** — The scored outcome of one case within a run.
- **Regression** — A detected degradation between two runs for the same case.

---

## Screenshots

| View | Description |
|------|-------------|
| **Dashboard** | Suite count, assertion status distribution, average latency, recent runs table. |
| **Eval Suites** | Card grid of all suites with case count, run count, and last score. |
| **Suite Detail** | Suite metadata, test cases table, run history table, run trigger modal. |
| **Run Detail** | Per-case results with expandable assertion details, regression summary, score distribution. |
| **Evidence Sources** | Grid of grounding documents with search, linked to their test cases. |
| **Regression Report** | Visualized in the Run Detail page when regressions are detected. |

> Screenshots are not yet committed. See the live deployment for current views.

---

## Local Setup

```bash
npm install
npm run dev
```

Opens on `http://localhost:3000`.

---

## Build & Deploy

```bash
npm run build       # builds frontend + bundles server
npm start           # runs the compiled server
```

Deployed via Vercel. The `api/` directory contains the serverless entry point; `vercel.json` handles routing.

---

## Known Limitations (v1.0)

- **Simulated scoring** — Runs use deterministic mock profiles (optimized, average, stale), not live LLM calls. No API keys required.
- **No authentication** — Single-user sandbox. No multi-tenant isolation.
- **Basic assertions** — Keyword matching only. No LLM-as-judge or semantic scoring.
- **File-based persistence** — JSON store does not survive cold starts in serverless environments. For production, replace with a real database.
- **No streaming** — Runs are synchronous and complete in a single request.
- **No export/import** — Suite definitions cannot be exported or imported as files.

---

## Next Milestone

- Live LLM integration (Gemini, OpenAI, Claude) replacing the simulation engine.
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
