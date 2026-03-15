/**
 * Shared test utilities and model fixtures for pickai v2 tests.
 */

import type { Model } from "./types";

/** Deep-merge defaults with overrides for nested Model fields. */
export function createModel(overrides: Partial<Model> = {}): Model {
  const id = overrides.id ?? "test-model";
  const provider = overrides.provider ?? "test";
  return {
    id,
    name: overrides.name ?? "Test Model",
    provider,
    openRouterId: overrides.openRouterId ?? `${provider}/${id}`,
    cost: "cost" in overrides
      ? overrides.cost
      : { input: 1, output: 2 },
    limit: { context: 128_000, output: 4_096, ...overrides.limit },
    modalities: {
      input: ["text"],
      output: ["text"],
      ...overrides.modalities,
    },
    toolCall: overrides.toolCall ?? true,
    ...(overrides.description !== undefined && { description: overrides.description }),
    ...(overrides.reasoning !== undefined && { reasoning: overrides.reasoning }),
    ...(overrides.structuredOutput !== undefined && { structuredOutput: overrides.structuredOutput }),
    ...(overrides.openWeights !== undefined && { openWeights: overrides.openWeights }),
    ...(overrides.attachment !== undefined && { attachment: overrides.attachment }),
    ...(overrides.family !== undefined && { family: overrides.family }),
    ...(overrides.knowledge !== undefined && { knowledge: overrides.knowledge }),
    ...(overrides.releaseDate !== undefined && { releaseDate: overrides.releaseDate }),
    ...(overrides.lastUpdated !== undefined && { lastUpdated: overrides.lastUpdated }),
    ...(overrides.status !== undefined && { status: overrides.status }),
    ...(overrides.sdk !== undefined && { sdk: overrides.sdk }),
  };
}

/**
 * Representative model fixtures spanning providers, families, price ranges, capabilities.
 */
export const fixtures = {
  // --- Anthropic ---
  opus: createModel({
    id: "claude-opus-4-5",
    name: "Claude Opus 4.5",
    provider: "anthropic",
    openRouterId: "anthropic/claude-opus-4.5",
    cost: { input: 15, output: 75 },
    limit: { context: 200_000, output: 32_000 },
    modalities: { input: ["text", "image"], output: ["text"] },
    reasoning: true,
    toolCall: true,
    structuredOutput: true,
    family: "claude",
    knowledge: "2025-03",
    releaseDate: "2025-09-29",
    status: "active",
    sdk: "@ai-sdk/anthropic",
  }),

  sonnet: createModel({
    id: "claude-sonnet-4-5",
    name: "Claude Sonnet 4.5",
    provider: "anthropic",
    openRouterId: "anthropic/claude-sonnet-4.5",
    cost: { input: 3, output: 15 },
    limit: { context: 200_000, output: 16_000 },
    modalities: { input: ["text", "image"], output: ["text"] },
    reasoning: true,
    toolCall: true,
    structuredOutput: true,
    family: "claude",
    knowledge: "2025-03",
    releaseDate: "2025-09-29",
    status: "active",
    sdk: "@ai-sdk/anthropic",
  }),

  haiku: createModel({
    id: "claude-haiku-4-5",
    name: "Claude Haiku 4.5",
    provider: "anthropic",
    openRouterId: "anthropic/claude-haiku-4.5",
    cost: { input: 1, output: 5 },
    limit: { context: 200_000, output: 8_192 },
    modalities: { input: ["text", "image"], output: ["text"] },
    toolCall: true,
    structuredOutput: true,
    family: "claude",
    knowledge: "2025-03",
    releaseDate: "2025-10-01",
    status: "active",
    sdk: "@ai-sdk/anthropic",
  }),

  // --- OpenAI ---
  gpt5Pro: createModel({
    id: "gpt-5-2-pro",
    name: "GPT-5.2 Pro",
    provider: "openai",
    openRouterId: "openai/gpt-5-2-pro",
    cost: { input: 21, output: 168 },
    limit: { context: 256_000, output: 32_000 },
    modalities: { input: ["text", "image"], output: ["text"] },
    reasoning: true,
    toolCall: true,
    structuredOutput: true,
    family: "gpt",
    knowledge: "2025-09",
    releaseDate: "2026-01-15",
    status: "active",
    sdk: "@ai-sdk/openai",
  }),

  gpt4o: createModel({
    id: "gpt-4o",
    name: "GPT-4o",
    provider: "openai",
    openRouterId: "openai/gpt-4o",
    cost: { input: 2.5, output: 10 },
    limit: { context: 128_000, output: 16_384 },
    modalities: { input: ["text", "image"], output: ["text"] },
    toolCall: true,
    structuredOutput: true,
    family: "gpt",
    knowledge: "2024-06",
    releaseDate: "2024-11-20",
    status: "active",
    sdk: "@ai-sdk/openai",
  }),

  gpt52: createModel({
    id: "gpt-5-2",
    name: "GPT-5.2",
    provider: "openai",
    openRouterId: "openai/gpt-5-2",
    cost: { input: 5, output: 25 },
    limit: { context: 256_000, output: 16_384 },
    modalities: { input: ["text", "image"], output: ["text"] },
    reasoning: true,
    toolCall: true,
    structuredOutput: true,
    family: "gpt",
    knowledge: "2025-09",
    releaseDate: "2026-01-15",
    status: "active",
    sdk: "@ai-sdk/openai",
  }),

  gpt4oMini: createModel({
    id: "gpt-4o-mini",
    name: "GPT-4o Mini",
    provider: "openai",
    openRouterId: "openai/gpt-4o-mini",
    cost: { input: 0.15, output: 0.6 },
    limit: { context: 128_000, output: 16_384 },
    modalities: { input: ["text", "image"], output: ["text"] },
    toolCall: true,
    structuredOutput: true,
    family: "gpt",
    knowledge: "2024-06",
    releaseDate: "2024-07-18",
    status: "active",
    sdk: "@ai-sdk/openai",
  }),

  // --- Google ---
  geminiPro: createModel({
    id: "gemini-2-5-pro",
    name: "Gemini 2.5 Pro",
    provider: "google",
    openRouterId: "google/gemini-2-5-pro",
    cost: { input: 10, output: 30 },
    limit: { context: 1_000_000, output: 65_536 },
    modalities: { input: ["text", "image", "audio", "video"], output: ["text"] },
    reasoning: true,
    toolCall: true,
    structuredOutput: true,
    family: "gemini",
    knowledge: "2025-01",
    releaseDate: "2025-06-01",
    status: "active",
    sdk: "@ai-sdk/google",
  }),

  flash: createModel({
    id: "gemini-2-5-flash",
    name: "Gemini 2.5 Flash",
    provider: "google",
    openRouterId: "google/gemini-2-5-flash",
    cost: { input: 0.075, output: 0.3 },
    limit: { context: 1_000_000, output: 65_536 },
    modalities: { input: ["text", "image", "audio", "video"], output: ["text"] },
    toolCall: true,
    structuredOutput: true,
    family: "gemini",
    knowledge: "2025-01",
    releaseDate: "2025-06-01",
    status: "active",
    sdk: "@ai-sdk/google",
  }),

  // --- DeepSeek ---
  deepseekR1: createModel({
    id: "deepseek-r1",
    name: "DeepSeek R1",
    provider: "deepseek",
    openRouterId: "deepseek/deepseek-r1",
    cost: { input: 0.55, output: 2.19 },
    limit: { context: 128_000, output: 8_192 },
    modalities: { input: ["text"], output: ["text"] },
    reasoning: true,
    toolCall: false,
    openWeights: true,
    family: "deepseek",
    knowledge: "2025-02",
    releaseDate: "2025-01-20",
    status: "active",
    sdk: "@ai-sdk/deepseek",
  }),

  // --- Deprecated fixture ---
  deprecated: createModel({
    id: "gpt-3-5-turbo",
    name: "GPT-3.5 Turbo",
    provider: "openai",
    openRouterId: "openai/gpt-3-5-turbo",
    cost: { input: 0.5, output: 1.5 },
    limit: { context: 16_385, output: 4_096 },
    modalities: { input: ["text"], output: ["text"] },
    toolCall: true,
    family: "gpt",
    knowledge: "2021-09",
    releaseDate: "2023-03-01",
    status: "deprecated",
  }),
};

/** All models as an array (excludes deprecated). */
export const allModels: Model[] = [
  fixtures.opus,
  fixtures.gpt5Pro,
  fixtures.geminiPro,
  fixtures.sonnet,
  fixtures.gpt4o,
  fixtures.gpt52,
  fixtures.haiku,
  fixtures.gpt4oMini,
  fixtures.flash,
  fixtures.deepseekR1,
];
