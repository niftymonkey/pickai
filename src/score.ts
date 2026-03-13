/**
 * Scoring criteria and composition for model evaluation.
 *
 * Each criterion returns a value in the 0-1 range. Use scoreModels()
 * to combine weighted criteria into a final ranked list.
 */

import type { Model, ScoredModel, ScoringCriterion, WeightedCriterion } from "./types";

// ---------------------------------------------------------------------------
// Min-max normalization helpers
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

/** Parse a date string to a timestamp, returning 0 for missing or invalid values. */
function safeTimestamp(value?: string): number {
  if (!value) return 0;
  const ts = new Date(value).getTime();
  return Number.isNaN(ts) ? 0 : ts;
}

// ---------------------------------------------------------------------------
// Scoring criteria
// ---------------------------------------------------------------------------

/**
 * Cheaper models score higher. Min-max normalized over the model set.
 * Uses input cost; missing cost treated as $0.
 */
export const costEfficiency: ScoringCriterion = (model, allModels) => {
  const prices = allModels.map((m) => m.cost?.input ?? 0);
  const { min, max } = range(prices);
  const price = model.cost?.input ?? 0;
  return minMax(price, min, max) === 0 && min === max ? 0 : 1 - minMax(price, min, max);
};

/**
 * Larger context window scores higher. Min-max normalized.
 */
export const contextCapacity: ScoringCriterion = (model, allModels) => {
  const sizes = allModels.map((m) => m.limit.context);
  const { min, max } = range(sizes);
  return minMax(model.limit.context, min, max);
};

/**
 * Newer models score higher based on release date. Min-max normalized.
 * Missing releaseDate treated as epoch (oldest).
 */
export const recency: ScoringCriterion = (model, allModels) => {
  const timestamps = allModels.map((m) => safeTimestamp(m.releaseDate));
  const { min, max } = range(timestamps);
  return minMax(safeTimestamp(model.releaseDate), min, max);
};

/**
 * More recent knowledge cutoff scores higher. Min-max normalized.
 * Missing knowledge treated as oldest ("0000-00").
 */
export const knowledgeFreshness: ScoringCriterion = (model, allModels) => {
  const toNum = (k?: string) => safeTimestamp(k ? k + "-01" : undefined);
  const values = allModels.map((m) => toNum(m.knowledge));
  const { min, max } = range(values);
  return minMax(toNum(model.knowledge), min, max);
};

/**
 * Larger output limit scores higher. Min-max normalized.
 */
export const outputCapacity: ScoringCriterion = (model, allModels) => {
  const sizes = allModels.map((m) => m.limit.output);
  const { min, max } = range(sizes);
  return minMax(model.limit.output, min, max);
};

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
  criteria: WeightedCriterion[],
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
