/**
 * Scoring criteria and composition for model evaluation.
 *
 * Each criterion returns a value in the 0-1 range. Use scoreModels()
 * to combine weighted criteria into a final ranked list.
 */

import type { Model, ScoredModel, ScoringCriterion, WeightedCriterion, ModelTier } from "./types";
import { Tier } from "./types";
import { classifyTier } from "./classify";
import { extractVersion } from "./id";

// ---------------------------------------------------------------------------
// Min-max normalization helper
// ---------------------------------------------------------------------------

/** Normalize a value into 0-1 using min-max. Returns 0 when min === max. */
function minMax(value: number, min: number, max: number): number {
  if (max === min) return 0;
  return (value - min) / (max - min);
}

/** Extract min/max from a set of numeric values. */
function range(values: number[]): { min: number; max: number } {
  let min = Infinity;
  let max = -Infinity;
  for (const v of values) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  return { min, max };
}

// ---------------------------------------------------------------------------
// Scoring criteria
// ---------------------------------------------------------------------------

/**
 * Cheaper models score higher. Min-max normalized over the model set.
 * Uses input pricing; missing pricing treated as $0.
 */
export const costEfficiency: ScoringCriterion = (model, allModels) => {
  const prices = allModels.map((m) => m.pricing?.input ?? 0);
  const { min, max } = range(prices);
  const price = model.pricing?.input ?? 0;
  // Invert: cheaper = higher score
  return minMax(price, min, max) === 0 && min === max ? 0 : 1 - minMax(price, min, max);
};

/**
 * Larger context window scores higher. Min-max normalized.
 * Missing contextWindow treated as 0.
 */
export const contextCapacity: ScoringCriterion = (model, allModels) => {
  const sizes = allModels.map((m) => m.contextWindow ?? 0);
  const { min, max } = range(sizes);
  return minMax(model.contextWindow ?? 0, min, max);
};

/**
 * Newer models score higher based on created date. Min-max normalized.
 * Missing created date treated as epoch (0).
 */
export const recency: ScoringCriterion = (model, allModels) => {
  const timestamps = allModels.map((m) => m.created ? new Date(m.created).getTime() : 0);
  const { min, max } = range(timestamps);
  const ts = model.created ? new Date(model.created).getTime() : 0;
  return minMax(ts, min, max);
};

/**
 * Higher version number scores higher. Min-max normalized.
 * Uses extractVersion() from id.ts.
 */
export const versionFreshness: ScoringCriterion = (model, allModels) => {
  const versions = allModels.map((m) => extractVersion(m.id));
  const { min, max } = range(versions);
  return minMax(extractVersion(model.id), min, max);
};

// Tier ordering for distance calculation
const TIER_ORDER: ModelTier[] = [Tier.Efficient, Tier.Standard, Tier.Flagship];

/**
 * Returns a ScoringCriterion that scores models based on tier proximity.
 * Exact match = 1.0, adjacent = 0.5, distant = 0.1.
 */
export function tierFit(targetTier: ModelTier): ScoringCriterion {
  const targetIdx = TIER_ORDER.indexOf(targetTier);
  return (model: Model) => {
    const modelIdx = TIER_ORDER.indexOf(classifyTier(model));
    const distance = Math.abs(targetIdx - modelIdx);
    if (distance === 0) return 1.0;
    if (distance === 1) return 0.5;
    return 0.1;
  };
}

// ---------------------------------------------------------------------------
// Composition
// ---------------------------------------------------------------------------

/**
 * Score models using weighted criteria and return sorted results.
 *
 * - Normalizes weights to sum to 1
 * - Computes weighted sum per model
 * - Returns ScoredModel[] sorted by score descending
 * - All-zero weights produce all-zero scores
 */
export function scoreModels<T extends Model>(
  models: T[],
  criteria: WeightedCriterion[]
): ScoredModel<T>[] {
  if (models.length === 0) return [];

  const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0);

  return models
    .map((model) => {
      let score = 0;
      if (totalWeight > 0) {
        for (const { criterion, weight } of criteria) {
          score += (weight / totalWeight) * criterion(model, models);
        }
      }
      return { ...model, score };
    })
    .sort((a, b) => b.score - a.score);
}
