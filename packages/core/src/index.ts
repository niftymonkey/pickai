// Types and constants
export type {
  Model,
  ScoredModel,
  ScoringCriterion,
  WeightedCriterion,
  PurposeProfile,
  ModelTier,
  CostTier,
  Constraint,
  SelectionOptions,
} from "./types";
export { Tier, Cost } from "./types";

// ID utilities
export {
  normalizeModelId,
  parseModelId,
  resolveProvider,
  extractDirectModelId,
  toOpenRouterFormat,
  toDirectFormat,
  matchesModel,
  extractVersion,
} from "./id";
export type { ParsedModelId } from "./id";

// Format utilities
export {
  formatPrice,
  formatPricing,
  formatContextWindow,
  formatProviderName,
} from "./format";

// Classification
export {
  classifyTier,
  classifyCostTier,
  maxTier,
  minTier,
  maxCost,
  minCost,
  supportsTools,
  supportsVision,
  isTextFocused,
} from "./classify";

// Scoring
export {
  costEfficiency,
  contextCapacity,
  recency,
  versionFreshness,
  tierFit,
  scoreModels,
} from "./score";

// Selection
export { providerDiversity, minContextWindow, selectModels } from "./select";

// Enrichment
export { enrich } from "./enrich";
export type { EnrichedModel } from "./enrich";

// Grouping
export { groupByProvider } from "./group";
export type { ProviderGroup } from "./group";

// Purpose
export { Purpose, purposes, recommend } from "./purpose";
export type { PurposeName, RecommendOptions } from "./purpose";

// Adapters (also available via @pickai/core/adapters subpath)
export { parseOpenRouterModel, parseOpenRouterCatalog } from "./adapters/openrouter";
export type { OpenRouterModel } from "./adapters/openrouter";
