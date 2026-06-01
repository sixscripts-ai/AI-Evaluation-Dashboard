/**
 * Gemini provider runner.
 *
 * Calls the Google AI Generative Language API server-side.
 * Reads GEMINI_API_KEY from process.env only.
 * No key is logged, returned in errors, or exposed to the browser.
 */

import { ModelRunInput, ModelRunOutput, ProviderRunner } from './types.js';

const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';

interface GeminiPart {
  text?: string;
}

interface GeminiContent {
  role: 'user' | 'model';
  parts: GeminiPart[];
}

interface GeminiRequest {
  contents: GeminiContent[];
  generationConfig?: {
    temperature?: number;
    maxOutputTokens?: number;
  };
}

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: GeminiPart[]; role?: string };
    finishReason?: string;
  }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
}

const PER_CASE_TIMEOUT_MS = 30_000;

function safeErrorMessage(status: number, body: string): string {
  // Never echo the API key. We do not include headers or query strings in
  // the returned error string.
  if (status === 401 || status === 403) {
    return `Gemini authentication failed (${status}). Check GEMINI_API_KEY.`;
  }
  if (status === 404) {
    return `Gemini model not found (${status}). The model may not be available in your region or tier.`;
  }
  if (status === 429) {
    return `Gemini rate limit exceeded (429). Slow down or upgrade your quota.`;
  }
  if (status >= 500) {
    return `Gemini server error (${status}). Try again later.`;
  }
  // Truncate unknown body to avoid logging large or sensitive payloads.
  const trimmed = body.slice(0, 200).replace(/[\r\n]+/g, ' ');
  return `Gemini request failed (${status}): ${trimmed}`;
}

export const geminiRunner: ProviderRunner = {
  async runModel(input: ModelRunInput): Promise<ModelRunOutput> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return {
        output: '',
        latencyMs: 0,
        error: 'GEMINI_API_KEY is not set. Add it to your environment or Vercel project settings.',
      };
    }

    const start = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), PER_CASE_TIMEOUT_MS);

    const url = `${ENDPOINT}/${encodeURIComponent(input.model)}:generateContent`;
    const body: GeminiRequest = {
      contents: [
        {
          role: 'user',
          parts: [{ text: input.input }],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 1024,
      },
    };

    if (input.systemPrompt) {
      // Gemini's generateContent doesn't have a top-level system_instruction
      // field in all v1beta endpoints, so we prepend it to the user turn.
      body.contents[0].parts[0].text = `${input.systemPrompt}\n\n${input.input}`;
    }

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
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

      let parsed: GeminiResponse;
      try {
        parsed = JSON.parse(text) as GeminiResponse;
      } catch {
        return {
          output: '',
          latencyMs,
          finishReason: 'error',
          error: 'Gemini returned a malformed response.',
        };
      }

      if (parsed.error) {
        return {
          output: '',
          latencyMs,
          finishReason: 'error',
          error: parsed.error.message || 'Gemini returned an error payload.',
        };
      }

      const parts = parsed.candidates?.[0]?.content?.parts;
      const output = (parts || [])
        .map((p) => (typeof p?.text === 'string' ? p.text : ''))
        .join('')
        .trim();

      if (!output) {
        return {
          output: '',
          latencyMs,
          finishReason: parsed.candidates?.[0]?.finishReason || 'empty',
          error: 'Gemini returned an empty response. The model may have been blocked by safety filters.',
        };
      }

      return {
        output,
        latencyMs,
        inputTokens: parsed.usageMetadata?.promptTokenCount,
        outputTokens: parsed.usageMetadata?.candidatesTokenCount,
        totalTokens: parsed.usageMetadata?.totalTokenCount,
        finishReason: parsed.candidates?.[0]?.finishReason,
      };
    } catch (err: any) {
      const latencyMs = Date.now() - start;
      if (err?.name === 'AbortError') {
        return {
          output: '',
          latencyMs,
          finishReason: 'timeout',
          error: `Gemini request timed out after ${PER_CASE_TIMEOUT_MS}ms.`,
        };
      }
      return {
        output: '',
        latencyMs,
        finishReason: 'error',
        error: `Gemini request failed: ${err?.message || 'unknown error'}.`,
      };
    } finally {
      clearTimeout(timeout);
    }
  },
};

export const geminiInfo = {
  id: 'gemini' as const,
  label: 'Gemini',
  defaultModel: 'gemini-2.5-flash',
  description: 'Free-tier via AI Studio. 1500 req/day.',
  models: ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-1.5-flash', 'gemini-1.5-pro'],
  envVar: 'GEMINI_API_KEY',
  available: Boolean(process.env.GEMINI_API_KEY),
};
