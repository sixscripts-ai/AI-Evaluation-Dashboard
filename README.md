# EvalBench — AI Evaluation Dashboard

Evaluation infrastructure for RAG answers, agent decisions, evidence coverage, assertions, and regression behavior across model runs.

**Live deployment:** [ai-evaluation-dashboard.vercel.app](https://ai-evaluation-dashboard.vercel.app/)

---

## What It Is

EvalBench is a full-stack evaluation dashboard for testing **Retrieval-Augmented Generation (RAG)** systems, autonomous **AI Agents**, classification rules, and text extractors. It helps teams verify that model outputs are accurate, evidence-grounded, and within performance SLAs.

The app runs simulated evaluation sweeps across configurable test suites, scores each case against assertion rules, tracks regressions between runs, and surfaces everything in a dark technical dashboard.

---

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite 6 |
| Backend | Express + Node.js |
| Validation | Zod |
| Persistence | File-based JSON store (`src/db-store.json`) |
| Styling | Tailwind CSS + custom CSS |
| Deployment | Vercel (serverless) |

---

## Features

- **Evaluation Suites** — Group test cases into cohorts (e.g. *GhostSSH Role Matching*, *ICT Knowledge Engine*, *Campus Compass*).
- **Test Cases** — Each case defines an input prompt, expected output, required evidence, tags, and difficulty.
- **Simulated Runs** — Trigger runs with configurable model names, version tags, and simulation profiles (Optimized / Average / Stale).
- **Assertion Engine** — Each result is scored against rule-based assertions.
- **Regression Detection** — Compares each new run against the previous run for the same suite. Flags score drops, status downgrades, evidence loss, and latency spikes.
- **Telemetry Dashboard** — Aggregated metrics: suite counts, pass/partial/fail distribution, average latency, recent runs, and regression alerts.
- **Evidence Sources** — Attach grounding documents to each test case and track whether the output references them.
- **Data Reset** — Reset to factory seed data from the Demo Controllers panel.

---

## Assertion Types

| Type | What It Checks |
|------|---------------|
| `outputIncludes` | Does the actual output contain expected keywords? |
| `evidenceIncludes` | Does the output reference the required evidence? |
| `latencyLessThanMs` | Did the response complete within the 1500ms SLA? |

---

## Regression Detection

A regression is logged when a new run degrades relative to the previous completed run for the same suite:

1. **Status downgrade** — PASS → PARTIAL/FAIL or PARTIAL → FAIL
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

- **Simulated scoring** — Runs use deterministic mock profiles, not live LLM calls. No API keys required.
- **No authentication** — Single-user sandbox. No multi-tenant isolation.
- **Basic assertions** — Keyword matching only. No LLM-as-judge or semantic scoring.
- **File-based persistence** — JSON store resets on cold starts in serverless environments. Use the reset endpoint or re-seed as needed.

---

## Next Milestone

- Live LLM integration (gemini, gpt, claude)
- Persistent database (SQLite or Postgres)
- LLM-as-judge assertion mode
- User-defined custom assertions
- Export / import suite definitions
