/**
 * Core types for pickai v2
 *
 * Metadata-first model intelligence powered by models.dev.
 */

// ---------------------------------------------------------------------------
// Model shape
// ---------------------------------------------------------------------------

/** Pricing per 1M tokens (USD). */
export interface ModelCost {
  input: number;
  output: number;
  cacheRead?: number;
  cacheWrite?: number;
}

/** Token limits. */
export interface ModelLimit {
  context: number;
  output: number;
}

/** Input/output modality lists. */
export interface ModelModalities {
  input: string[];
  output: string[];
}

/**
 * Normalized model representation across all providers.
 *
 * `id` is the models.dev ID, which matches direct provider API / AI SDK format.
 * `openRouterId` is the OpenRouter API slug, derived at parse time.
 */
export interface Model {
  /** models.dev ID: "claude-sonnet-4-5", "gpt-4o", "gemini-2.5-flash" */
  id: string;
  /** Human-readable display name */
  name: string;
  /** Provider slug: "anthropic", "openai", "google" */
  provider: string;
  /** Brief description */
  description?: string;
  /** Pricing per 1M tokens (USD). Undefined = unknown pricing. */
  cost?: ModelCost;
  /** Token limits (context window, max output) */
  limit: ModelLimit;
  /** Input/output modalities */
  modalities: ModelModalities;
  /** Supports chain-of-thought / extended thinking */
  reasoning?: boolean;
  /** Supports tool/function calling */
  toolCall?: boolean;
  /** Supports structured output / JSON mode */
  structuredOutput?: boolean;
  /** Open-weights model */
  openWeights?: boolean;
  /** Supports file/image attachments */
  attachment?: boolean;
  /** Model family: "claude", "gpt", "gemini" */
  family?: string;
  /** Knowledge cutoff date: "2024-06", "2025-03" */
  knowledge?: string;
  /** Release date: "2025-09-29" */
  releaseDate?: string;
  /** Last updated date */
  lastUpdated?: string;
  /** Model status: "active", "deprecated", "beta" */
  status?: string;
  /** AI SDK provider package: "@ai-sdk/anthropic" */
  sdk?: string;
  /** OpenRouter API slug: "anthropic/claude-sonnet-4.5" */
  openRouterId: string;
}

