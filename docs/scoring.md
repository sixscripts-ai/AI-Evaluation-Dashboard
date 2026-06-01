# Scoring

EvalBench uses a rule-based scoring engine to evaluate model outputs against test case expectations. This document describes how scoring works in the current build, including its simulated nature and known limitations.

## Overview

Each test case defines:

- An **input** (the prompt sent to the model)
- An **expected output** (the canonical answer)
- A **required evidence** string (a keyword or phrase that should appear in the output for grounding)
- A **difficulty** label (easy, medium, hard)
- A list of **assertions** to evaluate

When a run is triggered, the scoring engine produces a result for each test case. The result has:

- A **status** (pass, partial, fail)
- A **score** (0–100)
- A list of **assertions** with pass/fail and explanation
- An **evidenceMatched** boolean and a coverage score
- A **latency** in milliseconds

## Assertion types

The current engine supports three assertion types:

### `outputIncludes`

Checks whether the actual model output contains the expected output as a substring (case-insensitive).

- **Pass** if the expected string is found.
- **Fail** otherwise.

### `evidenceIncludes`

Checks whether the actual model output contains the required evidence string (case-insensitive). This validates grounding — that the model output references the source material.

- **Pass** if the evidence keyword is found.
- **Fail** otherwise.

### `latencyLessThanMs`

Checks whether the run completed within the 1500ms SLA.

- **Pass** if latency is strictly less than 1500ms.
- **Fail** otherwise.

## Status and score

A result's status and score are derived from its assertions:

| Status | Condition | Score |
|--------|-----------|-------|
| **pass** | All assertions pass | 100 |
| **partial** | At least one assertion passes, but not all | (passes / total) × 100 |
| **fail** | Zero assertions pass | 0 |

The overall suite score is the unweighted average of all result scores.

## Simulated runs

The current build does **not** call any external LLM. When a run is triggered, the engine generates a deterministic result based on the simulation profile:

- **Optimized** — Most cases pass with high scores; low latency.
- **Average** — Mixed pass/fail/partial; moderate latency.
- **Stale** — Tends toward failure and high latency; used to demonstrate regressions.

This is intentional: the app demonstrates evaluation infrastructure without requiring API keys or incurring model costs. The simulation profile is selected when triggering a run.

## Regression detection

When a new run is created, the engine compares it against the **previous completed run** for the same suite. A regression is logged for each test case that has degraded:

### `score_drop`

Logged when the case score drops by 15 or more points compared to the previous run. Severity is based on the magnitude of the drop:
- `low` — 15–30 point drop
- `medium` — 31–50 point drop
- `high` — 50+ point drop

### `status_downgrade`

Logged when the case status degrades (e.g. pass → partial, or partial → fail). Severity:
- `low` — pass → partial
- `medium` — pass → fail or partial → fail
- `high` — pass → fail (with prior score > 80)

### `evidence_lost`

Logged when the case was previously evidence-matched but the new run is not. Severity:
- `low` — coverage was < 50% before
- `medium` — coverage was 50–80%
- `high` — coverage was 80%+ before

### `latency_increase`

Logged when the case latency rose by 50% or more AND the new latency exceeds 1000ms. Severity:
- `low` — 50–100% increase, new latency 1000–2000ms
- `medium` — 100–200% increase, new latency 1000–3000ms
- `high` — 200%+ increase, new latency > 3000ms

## What's not implemented

The current scoring engine has known limitations:

- **No LLM-as-judge** — assertions are keyword-based, not semantic.
- **No fuzzy matching** — `outputIncludes` requires an exact substring match.
- **No multi-turn support** — each case is a single input/output pair.
- **No streaming** — runs complete synchronously.
- **No partial credit within an assertion** — each assertion is binary pass/fail.

For semantic evaluation, a future build should integrate a model API and add an `llmJudge` assertion type.
