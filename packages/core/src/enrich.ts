/**
 * Enrich models with pre-computed display fields.
 *
 * Decorates each Model with tier classification, cost tier, and
 * formatted strings — designed for .map():
 *
 *   const models = raw.map(enrich);
 */

import type { Model, ModelTier, CostTier } from "./types";
import { classifyTier, classifyCostTier } from "./classify";
import { formatPricing, formatContextWindow, formatProviderName } from "./format";

/**
 * A Model decorated with pre-computed classification and display fields.
 */
export interface EnrichedModel extends Model {
  /** Capability tier: Tier.Efficient, Tier.Standard, Tier.Flagship */
  tier: ModelTier;
  /** Cost tier: Cost.Free through Cost.Ultra */
  costTier: CostTier;
  /** Human-readable provider name: "Anthropic", "OpenAI", "Google" */
  providerName: string;
  /** Formatted pricing: "$3/$15 per 1M" or "Free", empty string if unknown */
  priceLabel: string;
  /** Formatted context window: "128K", "1.0M", empty string if unknown */
  contextLabel: string;
}

/**
 * Enrich a model with classification and formatted display fields.
 *
 * Designed for use with .map():
 * ```typescript
 * const models = parseOpenRouterCatalog(data).map(enrich);
 * ```
 */
export function enrich(model: Model): EnrichedModel {
  return {
    ...model,
    tier: classifyTier(model),
    costTier: classifyCostTier(model),
    providerName: formatProviderName(model.provider),
    priceLabel: model.pricing ? formatPricing(model.pricing) : "",
    contextLabel: model.contextWindow ? formatContextWindow(model.contextWindow) : "",
  };
}
