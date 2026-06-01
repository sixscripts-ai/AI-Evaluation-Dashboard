/**
 * Provider registry.
 *
 * Centralises provider lookup so the rest of the app does not need to
 * know which runner handles which provider ID. This is the only module
 * the API route imports for provider execution.
 */

import { ProviderId, ProviderInfo, ProviderRunner } from './types.js';
import { geminiRunner, geminiInfo } from './gemini.js';
import { groqRunner, groqInfo } from './groq.js';
import { openrouterRunner, openrouterInfo } from './openrouter.js';

export const PROVIDERS: Record<ProviderId, { runner: ProviderRunner; info: ProviderInfo }> = {
  gemini: { runner: geminiRunner, info: geminiInfo },
  groq: { runner: groqRunner, info: groqInfo },
  openrouter: { runner: openrouterRunner, info: openrouterInfo },
};

export function getRunner(provider: ProviderId): ProviderRunner {
  const entry = PROVIDERS[provider];
  if (!entry) {
    throw new Error(`Unknown provider: ${provider}`);
  }
  return entry.runner;
}

export function getProviderInfo(provider: ProviderId): ProviderInfo {
  const entry = PROVIDERS[provider];
  if (!entry) {
    throw new Error(`Unknown provider: ${provider}`);
  }
  return entry.info;
}

export function listProviders(): ProviderInfo[] {
  return [
    PROVIDERS.gemini.info,
    PROVIDERS.groq.info,
    PROVIDERS.openrouter.info,
  ];
}

export { geminiRunner, groqRunner, openrouterRunner };
export * from './types.js';
