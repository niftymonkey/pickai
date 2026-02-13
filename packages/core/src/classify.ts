/**
 * Model classification functions
 *
 * Classify models by tier, cost, and capabilities.
 * Ordinal helpers for filtering by tier/cost ranges.
 */

import type { Model, ModelTier, CostTier } from "./types";
import { Tier, Cost } from "./types";

// Ordinal ordering (lowest to highest)
const TIER_ORDER: ModelTier[] = [Tier.Efficient, Tier.Standard, Tier.Flagship];
const COST_ORDER: CostTier[] = [Cost.Free, Cost.Budget, Cost.Standard, Cost.Premium, Cost.Ultra];

/**
 * Classify a model into a capability tier based on name/id patterns and pricing.
 *
 * - Efficient: mini, nano, lite, flash, haiku, tiny, small
 * - Flagship: opus, ultra, pro, or pricing >= $10/M input
 * - Standard: everything else
 *
 * Note: Uses "-mini" and " mini" patterns to avoid matching "gemini".
 */
export function classifyTier(model: Model): ModelTier {
  const id = model.id.toLowerCase();
  const name = model.name.toLowerCase();

  // Efficient tier indicators
  const isEfficient =
    id.includes("-mini") ||
    id.includes("-nano") ||
    id.includes("-lite") ||
    id.includes("-flash") ||
    id.includes("haiku") ||
    id.includes("tiny") ||
    id.includes("-small") ||
    name.includes(" mini") ||
    name.includes(" nano") ||
    name.includes(" lite") ||
    name.includes(" flash") ||
    name.includes("haiku") ||
    name.includes("tiny") ||
    name.includes(" small");
  if (isEfficient) return Tier.Efficient;

  // Flagship tier indicators
  const flagshipPatterns = ["opus", "ultra"];
  const isFlagshipByName = flagshipPatterns.some(
    (p) => id.includes(p) || name.includes(p)
  );
  const isProModel = id.includes("-pro") || name.includes(" pro");
  const isHighCost = (model.pricing?.input ?? 0) >= 10;

  if (isFlagshipByName || isProModel || isHighCost) return Tier.Flagship;

  return Tier.Standard;
}

/**
 * Classify a model into a cost tier based on input pricing (per 1M tokens).
 *
 * | Tier     | Input price     | Examples                              |
 * |----------|-----------------|---------------------------------------|
 * | free     | $0              | Free-tier models                      |
 * | budget   | < $2/M          | Haiku ($1), GPT-4o Mini ($0.15)       |
 * | standard | $2 - $10/M      | Sonnet ($3), GPT-4o ($2.50)           |
 * | premium  | $10 - $20/M     | Opus ($15), o1 ($15), GPT-4 Turbo ($10) |
 * | ultra    | >= $20/M        | o3-pro ($20), GPT-5.2 Pro ($21), o1-pro ($150) |
 *
 * Boundaries based on the OpenRouter model catalog as of Feb 2026.
 */
export function classifyCostTier(model: Model): CostTier {
  const input = model.pricing?.input ?? 0;
  const output = model.pricing?.output ?? 0;

  if (input === 0 && output === 0) return Cost.Free;
  if (input < 2) return Cost.Budget;
  if (input < 10) return Cost.Standard;
  if (input < 20) return Cost.Premium;
  return Cost.Ultra;
}

// ---------------------------------------------------------------------------
// Ordinal helpers — filter predicates for tier/cost ranges
// ---------------------------------------------------------------------------

/**
 * Predicate: model's capability tier is at most the given tier.
 *
 * @example
 * models.filter(maxTier(Tier.Standard)) // efficient + standard
 */
export function maxTier(threshold: ModelTier): (model: Model) => boolean {
  const maxIdx = TIER_ORDER.indexOf(threshold);
  return (model) => TIER_ORDER.indexOf(classifyTier(model)) <= maxIdx;
}

/**
 * Predicate: model's capability tier is at least the given tier.
 *
 * @example
 * models.filter(minTier(Tier.Standard)) // standard + flagship
 */
export function minTier(threshold: ModelTier): (model: Model) => boolean {
  const minIdx = TIER_ORDER.indexOf(threshold);
  return (model) => TIER_ORDER.indexOf(classifyTier(model)) >= minIdx;
}

/**
 * Predicate: model's cost tier is at most the given tier.
 *
 * @example
 * models.filter(maxCost(Cost.Standard)) // free + budget + standard
 */
export function maxCost(threshold: CostTier): (model: Model) => boolean {
  const maxIdx = COST_ORDER.indexOf(threshold);
  return (model) => COST_ORDER.indexOf(classifyCostTier(model)) <= maxIdx;
}

/**
 * Predicate: model's cost tier is at least the given tier.
 *
 * @example
 * models.filter(minCost(Cost.Premium)) // premium + ultra
 */
export function minCost(threshold: CostTier): (model: Model) => boolean {
  const minIdx = COST_ORDER.indexOf(threshold);
  return (model) => COST_ORDER.indexOf(classifyCostTier(model)) >= minIdx;
}

// ---------------------------------------------------------------------------
// Capability checks
// ---------------------------------------------------------------------------

/**
 * Check if a model supports tool calling.
 */
export function supportsTools(model: Model): boolean {
  return model.capabilities?.tools === true;
}

/**
 * Check if a model supports vision (image input).
 * True if capabilities.vision is true OR input modalities include "image".
 */
export function supportsVision(model: Model): boolean {
  if (model.capabilities?.vision === true) return true;
  return model.modality?.input?.includes("image") === true;
}

/**
 * Check if a model is text-focused — outputs text but not image/audio/video.
 * Models that accept image input but only output text are included.
 * Returns true if modality is unset (assume text).
 */
export function isTextFocused(model: Model): boolean {
  const outputs = model.modality?.output;
  if (!outputs) return true;
  const excluded = ["image", "audio", "video"];
  return outputs.includes("text") && !outputs.some((m) => excluded.includes(m));
}
