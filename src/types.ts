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

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

/**
 * Model with a computed score attached.
 * Generic preserves the input type: score Model[], get ScoredModel<Model>[].
 */
export type ScoredModel<T extends Model = Model> = T & {
  /** Computed score (0-1 range, higher is better) */
  score: number;
};

/** Scores a model relative to the full set. Returns 0-1. */
export type ScoringCriterion = (model: Model, allModels: Model[]) => number;

/** A criterion paired with its relative weight. */
export interface WeightedCriterion {
  criterion: ScoringCriterion;
  weight: number;
}

// ---------------------------------------------------------------------------
// Filtering
// ---------------------------------------------------------------------------

/** Declarative model filter. All fields are AND-combined. */
export interface ModelFilter {
  /** Require reasoning capability */
  reasoning?: boolean;
  /** Require tool/function calling */
  toolCall?: boolean;
  /** Require structured output */
  structuredOutput?: boolean;
  /** Require open weights */
  openWeights?: boolean;
  /** Require attachment support */
  attachment?: boolean;
  /** Max input cost per 1M tokens (USD) */
  maxCostInput?: number;
  /** Max output cost per 1M tokens (USD) */
  maxCostOutput?: number;
  /** Minimum context window (tokens) */
  minContext?: number;
  /** Minimum output limit (tokens) */
  minOutput?: number;
  /** Include only these providers */
  providers?: string[];
  /** Exclude these providers */
  excludeProviders?: string[];
  /** Require these input modalities */
  inputModalities?: string[];
  /** Require these output modalities */
  outputModalities?: string[];
  /** Exclude deprecated models (default: true) */
  excludeDeprecated?: boolean;
  /** Minimum knowledge cutoff: "2024-06" */
  minKnowledge?: string;
}

// ---------------------------------------------------------------------------
// Purpose profiles
// ---------------------------------------------------------------------------

/** Purpose profile for model recommendation. */
export interface PurposeProfile {
  /** Pre-filter applied before scoring */
  filter?: ModelFilter;
  /** Weighted scoring criteria */
  criteria: WeightedCriterion[];
}

// ---------------------------------------------------------------------------
// Constraints
// ---------------------------------------------------------------------------

/**
 * Constraint function for model selection.
 * Returns true if the candidate can be added to the selected set.
 */
export type Constraint = (selected: Model[], candidate: Model) => boolean;

// ---------------------------------------------------------------------------
// API options
// ---------------------------------------------------------------------------

/** Options for find(). */
export interface FindOptions {
  /** Filter models. Object for declarative, function for custom logic. */
  filter?: ModelFilter | ((model: Model) => boolean);
  /** Sort comparator. Default: recency (newest first). Use sortByCost, sortByContext, etc. */
  sort?: (a: Model, b: Model) => number;
  /** Maximum number of results. */
  limit?: number;
}

/** Options for recommend(). */
export interface RecommendOptions {
  /** Additional filter combined with the profile's filter. */
  filter?: ModelFilter | ((model: Model) => boolean);
  /** Selection constraints (e.g., perProvider, perFamily). */
  constraints?: Constraint[];
  /** Number of models to return (default: 1). */
  limit?: number;
}
