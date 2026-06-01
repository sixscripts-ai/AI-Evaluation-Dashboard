/**
 * Model provider abstraction.
 *
 * EvalBench supports three free-tier-friendly model providers:
 * - Gemini (Google AI)
 * - Groq
 * - OpenRouter
 *
 * All provider calls are server-side only. API keys are read from
 * process.env and never exposed to the browser.
 */

export type ProviderId = 'gemini' | 'groq' | 'openrouter';
export type RunMode = 'simulated' | 'real';

export interface EvidenceExcerpt {
  title: string;
  excerpt: string;
  url?: string;
}

export interface ModelRunInput {
  provider: ProviderId;
  model: string;
  systemPrompt?: string;
  input: string;
  expectedOutput?: string;
  requiredEvidence?: string;
  evidenceSources?: EvidenceExcerpt[];
  metadata?: Record<string, any>;
}

export interface ModelRunOutput {
  output: string;
  rawResponse?: any;
  latencyMs: number;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  finishReason?: string;
  error?: string;
}

export interface ProviderInfo {
  id: ProviderId;
  label: string;
  defaultModel: string;
  envVar: string;
  available: boolean;
}

export interface ProviderRunner {
  runModel(input: ModelRunInput): Promise<ModelRunOutput>;
}
