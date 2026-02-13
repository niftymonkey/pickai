/**
 * Shared test utilities and model fixtures for pickai tests.
 */

import type { Model } from "./types";

/** Create a minimal Model for testing with sensible defaults. */
export function createModel(overrides: Partial<Model> = {}): Model {
  return {
    id: overrides.id || "test-model",
    apiId: overrides.apiId || overrides.id || "test-model",
    openRouterId:
      overrides.openRouterId || `test/${overrides.id || "test-model"}`,
    name: overrides.name || "Test Model",
    provider: overrides.provider || "test",
    contextWindow: overrides.contextWindow ?? 128000,
    pricing: overrides.pricing ?? { input: 1, output: 2 },
    modality: overrides.modality ?? { input: ["text"], output: ["text"] },
    capabilities: overrides.capabilities ?? { tools: true },
    ...overrides,
  };
}

/**
 * Representative model fixtures spanning providers, tiers, and pricing.
 * Designed to exercise scoring, selection, and purpose-profile logic.
 */
export const fixtures = {
  // Flagship tier
  opus: createModel({
    id: "claude-opus-4-5",
    apiId: "claude-opus-4-5-20250929",
    openRouterId: "anthropic/claude-opus-4-5",
    name: "Claude Opus 4.5",
    provider: "anthropic",
    contextWindow: 200000,
    pricing: { input: 15, output: 75 },
    capabilities: { tools: true, vision: true, streaming: true, json: true },
    created: "2025-09-29",
  }),
  gpt5Pro: createModel({
    id: "gpt-5-2-pro",
    apiId: "gpt-5-2-pro",
    openRouterId: "openai/gpt-5-2-pro",
    name: "GPT-5.2 Pro",
    provider: "openai",
    contextWindow: 256000,
    pricing: { input: 21, output: 168 },
    capabilities: { tools: true, vision: true, streaming: true, json: true },
    created: "2026-01-15",
  }),
  geminiPro: createModel({
    id: "gemini-2-5-pro",
    apiId: "gemini-2-5-pro",
    openRouterId: "google/gemini-2-5-pro",
    name: "Gemini 2.5 Pro",
    provider: "google",
    contextWindow: 1000000,
    pricing: { input: 10, output: 30 },
    capabilities: { tools: true, vision: true, streaming: true, json: true },
    created: "2025-06-01",
  }),

  // Standard tier
  sonnet: createModel({
    id: "claude-sonnet-4-5",
    apiId: "claude-sonnet-4-5-20250929",
    openRouterId: "anthropic/claude-sonnet-4-5",
    name: "Claude Sonnet 4.5",
    provider: "anthropic",
    contextWindow: 200000,
    pricing: { input: 3, output: 15 },
    capabilities: { tools: true, vision: true, streaming: true, json: true },
    created: "2025-09-29",
  }),
  gpt4o: createModel({
    id: "gpt-4o",
    apiId: "gpt-4o-2024-11-20",
    openRouterId: "openai/gpt-4o",
    name: "GPT-4o",
    provider: "openai",
    contextWindow: 128000,
    pricing: { input: 2.5, output: 10 },
    capabilities: { tools: true, vision: true, streaming: true, json: true },
    created: "2024-11-20",
  }),
  gpt52: createModel({
    id: "gpt-5-2",
    apiId: "gpt-5-2",
    openRouterId: "openai/gpt-5-2",
    name: "GPT-5.2",
    provider: "openai",
    contextWindow: 256000,
    pricing: { input: 5, output: 25 },
    capabilities: { tools: true, vision: true, streaming: true, json: true },
    created: "2026-01-15",
  }),

  // Efficient tier
  haiku: createModel({
    id: "claude-haiku-4-5",
    apiId: "claude-haiku-4-5-20251001",
    openRouterId: "anthropic/claude-haiku-4-5",
    name: "Claude Haiku 4.5",
    provider: "anthropic",
    contextWindow: 200000,
    pricing: { input: 1, output: 5 },
    capabilities: { tools: true, vision: true, streaming: true, json: true },
    created: "2025-10-01",
  }),
  gpt4oMini: createModel({
    id: "gpt-4o-mini",
    apiId: "gpt-4o-mini-2024-07-18",
    openRouterId: "openai/gpt-4o-mini",
    name: "GPT-4o Mini",
    provider: "openai",
    contextWindow: 128000,
    pricing: { input: 0.15, output: 0.6 },
    capabilities: { tools: true, vision: true, streaming: true, json: true },
    created: "2024-07-18",
  }),
  flash: createModel({
    id: "gemini-2-5-flash",
    apiId: "gemini-2-5-flash",
    openRouterId: "google/gemini-2-5-flash",
    name: "Gemini 2.5 Flash",
    provider: "google",
    contextWindow: 1000000,
    pricing: { input: 0.075, output: 0.3 },
    capabilities: { tools: true, vision: true, streaming: true, json: true },
    created: "2025-06-01",
  }),

  // Special: no tools, code-specialized
  coder: createModel({
    id: "deepseek-coder-v2",
    apiId: "deepseek-coder-v2",
    openRouterId: "deepseek/deepseek-coder-v2",
    name: "DeepSeek Coder V2",
    provider: "deepseek",
    contextWindow: 128000,
    pricing: { input: 0.14, output: 0.28 },
    capabilities: { tools: false, streaming: true },
    created: "2024-06-01",
  }),

  // Special: vision-specialized output model
  imageGen: createModel({
    id: "dall-e-3",
    apiId: "dall-e-3",
    openRouterId: "openai/dall-e-3",
    name: "DALL-E 3",
    provider: "openai",
    contextWindow: 4096,
    pricing: { input: 0, output: 0 },
    modality: { input: ["text"], output: ["image"] },
    capabilities: {},
    created: "2023-10-01",
  }),
};

/** All representative models as an array (excludes imageGen by default). */
export const allTextModels: Model[] = [
  fixtures.opus,
  fixtures.gpt5Pro,
  fixtures.geminiPro,
  fixtures.sonnet,
  fixtures.gpt4o,
  fixtures.gpt52,
  fixtures.haiku,
  fixtures.gpt4oMini,
  fixtures.flash,
  fixtures.coder,
];
