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
