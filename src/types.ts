/**
 * TypeScript Data Models for EvalBench
 */

export type SystemType = 'rag' | 'agent' | 'classification' | 'extraction' | 'summarization' | 'other';
export type SuiteStatus = 'active' | 'archived';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type SourceType = 'document' | 'url' | 'note' | 'dataset' | 'code' | 'other';
export type RunStatus = 'queued' | 'running' | 'completed' | 'failed';
export type ResultStatus = 'pass' | 'partial' | 'fail';
export type RunMode = 'simulated' | 'real';
export type ProviderId = 'gemini' | 'groq' | 'openrouter';

export interface EvalSuite {
  id: string;
  name: string;
  description: string;
  project: string;
  systemType: SystemType;
  status: SuiteStatus;
  createdAt: string;
  updatedAt: string;
}

export interface EvalCase {
  id: string;
  suiteId: string;
  name: string;
  input: string;
  expectedOutput: string;
  requiredEvidence: string;
  tags: string[];
  difficulty: Difficulty;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EvidenceSource {
  id: string;
  caseId: string;
  title: string;
  sourceType: SourceType;
  url?: string;
  excerpt: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface EvalRun {
  id: string;
  suiteId: string;
  modelName: string;
  systemVersion: string;
  status: RunStatus;
  startedAt: string;
  completedAt?: string;
  averageScore?: number;
  passCount: number;
  partialCount: number;
  failCount: number;
  averageLatencyMs?: number;
  notes?: string;
  // Milestone 2 fields
  provider?: ProviderId | 'simulated';
  runMode?: RunMode;
  totalInputTokens?: number;
  totalOutputTokens?: number;
  totalTokens?: number;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AssertionResult {
  id: string;
  type: 'outputIncludes' | 'outputExcludes' | 'evidenceIncludes' | 'exactMatch' | 'scoreAtLeast' | 'latencyLessThanMs';
  status: 'pass' | 'fail';
  expected: string;
  actual: string;
  explanation: string;
}

export interface EvalResult {
  id: string;
  runId: string;
  caseId: string;
  actualOutput: string;
  status: ResultStatus;
  score: number;
  latencyMs?: number;
  failureReason?: string;
  evidenceMatched: boolean;
  evidenceCoverageScore?: number;
  assertions: AssertionResult[];
  notes?: string;
  // Milestone 2 fields
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  providerLatencyMs?: number;
  providerError?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Regression {
  id: string;
  runId: string;
  caseId: string;
  previousResultId?: string;
  regressionType: 'score_drop' | 'status_downgrade' | 'latency_increase' | 'evidence_lost';
  severity: 'low' | 'medium' | 'high';
  description: string;
  createdAt: string;
}

export interface ServerState {
  suites: EvalSuite[];
  cases: EvalCase[];
  sources: EvidenceSource[];
  runs: EvalRun[];
  results: EvalResult[];
  regressions: Regression[];
}
