# EvalBench — RAG & Agent Performance Evaluation Sandbox

EvalBench is professional, full-stack evaluation infrastructure designed specifically for developers, SecOps teams, and AI engineers to stress-test their **Retrieval-Augmented Generation (RAG)** systems, autonomous **AI Agents**, classification rules, and text extractors.

This application serves as an interactive Quality-Control telemetry console, helping verify that AI configurations generate secure, accurate, evidence-linked, and computationally efficient outputs without slipping into performance regressions or hallucinated states.

---

## Technical Stack & Control Architecture

*   **Client Core**: React 19 & Vite 6 (SPA)
*   **Vector Engine**: High-speed, dark-mode styling with Tailwind CSS & custom CSS animations
*   **Icons Framework**: Lucide React
*   **System Server**: Express Node.js
*   **Input Validator**: Zod
*   **Database persistence**: Shared File-based JSON Database (`/src/db-store.json`) with auto-seeding hooks
*   **Lifecycle Managers**: TSX & Esbuild bundle compilation pipelines

---

## Core Operational Features

1.  **Suites Workstation**: Configure specialized testing cohorts (e.g., *GhostSSH Role Matching*, *ICT Knowledge Engine*) mapped to specific system architectures.
2.  **Telemetry Dashboard**: Track global metrics in real time including aggregate runs score, latency SLA budgets, active test cases, and detected regressions.
3.  **Expanded Assertion Items**: Basic rule-based checking engine executing:
    *   `outputIncludes`: Confirms that specific terms exist in actual responses.
    *   `evidenceIncludes`: Identifies whether response material is correctly linked back to loaded evidence.
    *   `latencyLessThanMs`: Audits whether response times exceed critical SLAs (1500ms baseline limit).
4.  **Trend & Regressions alerts**: Compares subsequent completed runs against baseline historical values.
5.  **Evidence documentation indexing**: Stores and filters policy standards, compliance catalogs, and files connected to test cases.
6.  **Run Simulator panel**: Allows manual spawning of telemetry data using custom-profiled model response engines (*Optimized*, *Average Mix*, *Stale Fallback*) to stress-test alerts.

---

## Automated Scoring Logic

Tests are compiled to a clean percentage scale from `0` to `100`:
*   **COMPLETE PASS (100 pts)**: All output keyword assertions match and runtime latency falls within the 1500ms safety budget.
*   **PARTIAL MATCH (50 - 79 pts)**: Critical terms matched but either auxiliary evidence indexes are lost or SLA latency budgets are breached.
*   **CRITICAL FAILURE (0 - 49 pts)**: System logs server exceptions, outputs empty datasets, or completely fails grounding requirements.

---

## Regression Detection Strategy

A regression represents a degradation of quality between a new completed evaluation run and the *previous completed run* for the same suite.
The system automatically creates warning logs if any of the following boundaries are breached:
1.  **State Downgrade**: A test case status moves from `PASS` down to `PARTIAL`/`FAIL` or from `PARTIAL` to `FAIL`.
2.  **Core Metrics Drop**: The average score of a test case falls by `15` points or more.
3.  **Evidence Mismatch**: A RAG pipeline loses its connection to supporting facts (`evidenceMatched` switches from `true` to `false`).
4.  **Performance Degrade**: Response latency rises by `50%` or more *and* exceeds the `1000ms` SLA threshold.

---

## Data Model Schema

### 1. EvalSuite
*   `id`: string (Key)
*   `name`: string
*   `description`: string
*   `project`: string (System repository identifier)
*   `systemType`: `rag | agent | classification | extraction | summarization | other`
*   `status`: `active | archived`
*   `createdAt`: ISO Datetime string
*   `updatedAt`: ISO Datetime string

### 2. EvalCase
*   `id`: string (Key)
*   `suiteId`: string (Relation to Suite)
*   `name`: string
*   `input`: string (Checklist variables/Prompts payload)
*   `expectedOutput`: string (Target text assertions)
*   `requiredEvidence`: string (Grounding constraints)
*   `tags`: string[]
*   `difficulty`: `easy | medium | hard`
*   `notes`?: string (Developer annotations)
*   `isActive`: boolean
*   `createdAt`: ISO Datetime string

### 3. EvidenceSource
*   `id`: string (Key)
*   `caseId`: string (Relation to Case)
*   `title`: string
*   `sourceType`: `document | url | note | dataset | code | other`
*   `url`?: string
*   `excerpt`: string (Text section supporting grounding)

### 4. EvalRun
*   `id`: string (Key)
*   `suiteId`: string (Relation to Suite)
*   `modelName`: string (e.g. gemini-2.5-flash)
*   `systemVersion`: string (e.g. v1.4.0)
*   `status`: `queued | running | completed | failed`
*   `startedAt`: ISO Datetime string
*   `completedAt`: ISO Datetime string
*   `averageScore`: number (0-100)
*   `passCount`: number
*   `partialCount`: number
*   `failCount`: number
*   `averageLatencyMs`?: number

### 5. EvalResult
*   `id`: string (Key)
*   `runId`: string (Relation to Run)
*   `caseId`: string (Relation to Case)
*   `actualOutput`: string
*   `status`: `pass | partial | fail`
*   `score`: number
*   `latencyMs`?: number
*   `failureReason`?: string
*   `evidenceMatched`: boolean
*   `assertions`: JSON array of sub-checks

### 6. Regression
*   `id`: string (Key)
*   `runId`: string (Relation to Run)
*   `caseId`: string (Relation to Case)
*   `previousResultId`?: string
*   `regressionType`: `score_drop | status_downgrade | latency_increase | evidence_lost`
*   `severity`: `low | medium | high`
*   `description`: string

---

## Known Limitations (v1.0 Demo Release)

*   **Offline Simulation Engine**: Run simulations are triggered deterministic-mock profiles instead of calling live LLM APIs. This removes billing and billing key config limits during code evaluations.
*   **No Auth boundaries**: The workstation works as a unified multi-user shared sandbox repository console.
*   **Basic rule parsing**: Keyword comparison assertions search string indexes without syntactic grammar tree parsers or LLM-as-a-judge scorers.

---

## Workspace Setup & Execution Guide

### Local Dependencies Installation
Install pre-requisite packages:
```bash
npm install
```

### Run Workspace in Development Mode
Launches fullstack server (Express and dev Vite pipeline on Port 3000):
```bash
npm run dev
```

### Build & Package compiled bundle
Transpiles Vite client and bundles the Server into `/dist`:
```bash
npm run build
```

---

## How to use the sandbox workspace demo

1.  **Navigate to Suites**: Inspect pre-seeded configurations. Click **Trigger Run** on *ICT Knowledge Engine* or *Campus Compass*.
2.  **Vary Profiles**: Execute a run using the **Stale Fallback** engine. The run compiler will compare results, detect degradation limits, and log regressions!
3.  **Inspect Telemetry Reports**: Click "Report" inside the runs lists or look at the dashboard alert panel to see detailed assertion outputs.
4.  **Reset / Factory Seed State**: Navigate to **Demo Controllers** at any time to purge experimental modifications and restore the database state back to standard!
