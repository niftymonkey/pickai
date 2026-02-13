/**
 * Core types for pickai
 *
 * The shared vocabulary for model intelligence.
 */

// Branded types — ModelTier and CostTier are nominally distinct even though
// both contain a "standard" string value. The brand exists only at compile time;
// runtime values are plain strings.
declare const __brand: unique symbol;
type Branded<T, B> = T & { readonly [__brand]: B };

/** Model tier based on capability/size. */
export type ModelTier = Branded<string, "ModelTier">;

/** Cost tier based on pricing per 1M input tokens. */
export type CostTier = Branded<string, "CostTier">;

/**
 * Capability tier constants. Use `Tier.Flagship` instead of raw `"flagship"`.
 */
export const Tier = {
  Efficient: "efficient" as ModelTier,
  Standard: "standard" as ModelTier,
  Flagship: "flagship" as ModelTier,
} as const;

/**
 * Cost tier constants. Use `Cost.Premium` instead of raw `"premium"`.
 */
export const Cost = {
  Free: "free" as CostTier,
  Budget: "budget" as CostTier,
  Standard: "standard" as CostTier,
  Premium: "premium" as CostTier,
  Ultra: "ultra" as CostTier,
} as const;

/**
 * Normalized model representation across all providers.
 *
 * Three pre-computed IDs for different calling conventions:
 * - `id` — the model's identity ("claude-sonnet-4-5", "gpt-4o", "gemini-2.5-flash")
 * - `apiId` — for direct provider APIs / Vercel AI SDK ("claude-sonnet-4-5-20250929")
 * - `openRouterId` — for OpenRouter API ("anthropic/claude-sonnet-4-5")
 *
 * All three are set once when a Model is created (by an adapter or static data).
 * Consumers just grab the one they need — no conversion at call time.
 */
export interface Model {
  /** The model's base identity: "claude-sonnet-4-5", "gpt-4o", "gemini-2.5-flash" */
  id: string;
  /** For direct provider APIs and Vercel AI SDK: "claude-sonnet-4-5-20250929" */
  apiId: string;
  /** For OpenRouter API: "anthropic/claude-sonnet-4-5" */
  openRouterId: string;
  /** Human-readable display name */
  name: string;
  /** Provider slug (e.g., "anthropic", "openai", "google") */
  provider: string;
  /** Brief description */
  description?: string;
  /** Context window in tokens */
  contextWindow?: number;
  /** Pricing per 1M tokens (USD) */
  pricing?: {
    /** Cost per 1M input tokens */
    input: number;
    /** Cost per 1M output tokens */
    output: number;
  };
  /** Input/output modalities */
  modality?: {
    input: string[];
    output: string[];
  };
  /** Capability flags */
  capabilities?: {
    tools?: boolean;
    vision?: boolean;
    streaming?: boolean;
    json?: boolean;
  };
  /** Model creation/release date (ISO string or timestamp) */
  created?: string;
}

/**
 * Model with a computed score attached.
 */
export interface ScoredModel extends Model {
  /** Computed score (0-1 range, higher is better) */
  score: number;
}

/**
 * A scoring function that evaluates a model relative to the full set.
 * Returns a value in the 0-1 range.
 */
export type ScoringCriterion = (model: Model, allModels: Model[]) => number;

/**
 * A criterion paired with its weight.
 */
export interface WeightedCriterion {
  criterion: ScoringCriterion;
  weight: number;
}

/**
 * Purpose profile for model recommendation.
 */
export interface PurposeProfile {
  /** Preferred tier for this purpose */
  preferredTier: ModelTier;
  /** Weight distribution for scoring */
  weights: {
    cost: number;
    quality: number;
    context: number;
  };
  /** Hard requirements */
  require?: {
    tools?: boolean;
    minContext?: number;
  };
  /** Exclusion rules */
  exclude?: {
    tiers?: ModelTier[];
    patterns?: string[];
  };
}

/**
 * Constraint function for model selection.
 * Returns true if the candidate can be added to the selected set.
 */
export type Constraint = (selected: Model[], candidate: Model) => boolean;

/**
 * Options for the selectModels function.
 */
export interface SelectionOptions {
  /** Number of models to select (default: 1) */
  count?: number;
  /** Constraints to apply during selection */
  constraints?: Constraint[];
  /** Pre-filter function */
  filter?: (model: Model) => boolean;
}
