/**
 * Groq provider runner.
 *
 * Calls the Groq OpenAI-compatible chat completions API server-side.
 * Reads GROQ_API_KEY from process.env only.
 */

import { ModelRunInput, ModelRunOutput, ProviderRunner } from './types.js';

const ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';

interface GroqMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface GroqRequest {
  model: string;
  messages: GroqMessage[];
  temperature?: number;
  max_tokens?: number;
}

interface GroqResponse {
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
    code?: string;
  };
}

const PER_CASE_TIMEOUT_MS = 30_000;

function safeErrorMessage(status: number, body: string): string {
  if (status === 401 || status === 403) {
    return `Groq authentication failed (${status}). Check GROQ_API_KEY.`;
  }
  if (status === 404) {
    return `Groq model not found (${status}). The model may have been deprecated.`;
  }
  if (status === 429) {
    return `Groq rate limit exceeded (429). Free tier has tight per-minute limits.`;
  }
  if (status >= 500) {
    return `Groq server error (${status}). Try again later.`;
  }
  const trimmed = body.slice(0, 200).replace(/[\r\n]+/g, ' ');
  return `Groq request failed (${status}): ${trimmed}`;
}

export const groqRunner: ProviderRunner = {
  async runModel(input: ModelRunInput): Promise<ModelRunOutput> {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return {
        output: '',
        latencyMs: 0,
        error: 'GROQ_API_KEY is not set. Add it to your environment or Vercel project settings.',
      };
    }

    const start = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), PER_CASE_TIMEOUT_MS);

    const messages: GroqMessage[] = [];
    if (input.systemPrompt) {
      messages.push({ role: 'system', content: input.systemPrompt });
    }
    messages.push({ role: 'user', content: input.input });

    const body: GroqRequest = {
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

      let parsed: GroqResponse;
      try {
        parsed = JSON.parse(text) as GroqResponse;
      } catch {
        return {
          output: '',
          latencyMs,
          finishReason: 'error',
          error: 'Groq returned a malformed response.',
        };
      }

      if (parsed.error) {
        return {
          output: '',
          latencyMs,
          finishReason: 'error',
          error: parsed.error.message || 'Groq returned an error payload.',
        };
      }

      const content = parsed.choices?.[0]?.message?.content;
      if (typeof content !== 'string' || content.trim().length === 0) {
        return {
          output: '',
          latencyMs,
          finishReason: parsed.choices?.[0]?.finish_reason || 'empty',
          error: 'Groq returned an empty response.',
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
          error: `Groq request timed out after ${PER_CASE_TIMEOUT_MS}ms.`,
        };
      }
      return {
        output: '',
        latencyMs,
        finishReason: 'error',
        error: `Groq request failed: ${err?.message || 'unknown error'}.`,
      };
    } finally {
      clearTimeout(timeout);
    }
  },
};

export const groqInfo = {
  id: 'groq' as const,
  label: 'Groq',
  defaultModel: 'llama-3.1-8b-instant',
  description: 'Fast inference. Free tier: 30 req/min.',
  models: ['llama-3.1-8b-instant', 'llama-3.3-70b-versatile', 'mixtral-8x7b-32768', 'gemma2-9b-it'],
  envVar: 'GROQ_API_KEY',
  available: Boolean(process.env.GROQ_API_KEY),
};
