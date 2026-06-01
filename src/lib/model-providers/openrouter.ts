/**
 * OpenRouter provider runner.
 *
 * Calls the OpenRouter OpenAI-compatible chat completions API server-side.
 * Reads OPENROUTER_API_KEY from process.env only.
 *
 * OpenRouter aggregates many free and paid models. The default in this
 * project is `openai/gpt-oss-20b:free`, which is free-tier.
 */

import { ModelRunInput, ModelRunOutput, ProviderRunner } from './types.js';

const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';

interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenRouterRequest {
  model: string;
  messages: OpenRouterMessage[];
  temperature?: number;
  max_tokens?: number;
}

interface OpenRouterResponse {
  id?: string;
  choices?: Array<{
    index?: number;
    message?: { role?: string; content?: string };
    finish_reason?: string;
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  error?: {
    message?: string;
    type?: string;
    code?: number | string;
  };
}

const PER_CASE_TIMEOUT_MS = 30_000;

function safeErrorMessage(status: number, body: string): string {
  if (status === 401 || status === 403) {
    return `OpenRouter authentication failed (${status}). Check OPENROUTER_API_KEY.`;
  }
  if (status === 404) {
    return `OpenRouter model not found (${status}). The model may have been removed or is not available in your tier.`;
  }
  if (status === 429) {
    return `OpenRouter rate limit exceeded (429). Free models have per-minute caps.`;
  }
  if (status >= 500) {
    return `OpenRouter server error (${status}). Try again later.`;
  }
  const trimmed = body.slice(0, 200).replace(/[\r\n]+/g, ' ');
  return `OpenRouter request failed (${status}): ${trimmed}`;
}

export const openrouterRunner: ProviderRunner = {
  async runModel(input: ModelRunInput): Promise<ModelRunOutput> {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return {
        output: '',
        latencyMs: 0,
        error: 'OPENROUTER_API_KEY is not set. Add it to your environment or Vercel project settings.',
      };
    }

    const start = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), PER_CASE_TIMEOUT_MS);

    const messages: OpenRouterMessage[] = [];
    if (input.systemPrompt) {
      messages.push({ role: 'system', content: input.systemPrompt });
    }
    messages.push({ role: 'user', content: input.input });

    const body: OpenRouterRequest = {
      model: input.model,
      messages,
      temperature: 0.2,
      max_tokens: 1024,
    };

    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          // OpenRouter recommends identifying your app for their logs. We
          // identify as EvalBench, but we do NOT include any key material.
          'HTTP-Referer': 'https://ai-evaluation-dashboard.vercel.app',
          'X-Title': 'EvalBench',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      const latencyMs = Date.now() - start;
      const text = await res.text();

      if (!res.ok) {
        return {
          output: '',
          latencyMs,
          finishReason: 'error',
          error: safeErrorMessage(res.status, text),
        };
      }

      let parsed: OpenRouterResponse;
      try {
        parsed = JSON.parse(text) as OpenRouterResponse;
      } catch {
        return {
          output: '',
          latencyMs,
          finishReason: 'error',
          error: 'OpenRouter returned a malformed response.',
        };
      }

      if (parsed.error) {
        return {
          output: '',
          latencyMs,
          finishReason: 'error',
          error: parsed.error.message || 'OpenRouter returned an error payload.',
        };
      }

      const content = parsed.choices?.[0]?.message?.content;
      if (typeof content !== 'string' || content.trim().length === 0) {
        return {
          output: '',
          latencyMs,
          finishReason: parsed.choices?.[0]?.finish_reason || 'empty',
          error: 'OpenRouter returned an empty response.',
        };
      }

      return {
        output: content.trim(),
        latencyMs,
        inputTokens: parsed.usage?.prompt_tokens,
        outputTokens: parsed.usage?.completion_tokens,
        totalTokens: parsed.usage?.total_tokens,
        finishReason: parsed.choices?.[0]?.finish_reason,
      };
    } catch (err: any) {
      const latencyMs = Date.now() - start;
      if (err?.name === 'AbortError') {
        return {
          output: '',
          latencyMs,
          finishReason: 'timeout',
          error: `OpenRouter request timed out after ${PER_CASE_TIMEOUT_MS}ms.`,
        };
      }
      return {
        output: '',
        latencyMs,
        finishReason: 'error',
        error: `OpenRouter request failed: ${err?.message || 'unknown error'}.`,
      };
    } finally {
      clearTimeout(timeout);
    }
  },
};

export const openrouterInfo = {
  id: 'openrouter' as const,
  label: 'OpenRouter',
  defaultModel: 'openai/gpt-oss-20b:free',
  envVar: 'OPENROUTER_API_KEY',
  available: Boolean(process.env.OPENROUTER_API_KEY),
};
