/**
 * Scoring criteria and composition for model evaluation.
 *
 * Each criterion returns a value in the 0-1 range. Use scoreModels()
 * to combine weighted criteria into a final ranked list.
 */

import type {
  CriterionCoverage,
  Model,
  ScoredModel,
  ScoringCriterion,
  WeightedCriterion,
} from "./types";

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
// Criterion helpers
// ---------------------------------------------------------------------------

/**
 * Create a min-max normalized scoring criterion from a value extractor.
 *
 * Pass a function that extracts a numeric value from a model. Returns a
 * ScoringCriterion that min-max normalizes across the candidate set.
 * Models where the extractor returns undefined are uncovered: the criterion
 * returns undefined, which contributes 0 to the score and is reported as
 * missing data in coverage.
 *
 * @param getValue - Extracts a numeric value from a model, or undefined if unavailable
 * @param invert - If true, lower values score higher (useful for cost).
 *   Prefer invert over negating inside getValue: an expression like
 *   `1 - (cost ?? Infinity)` turns missing data into a huge negative score,
 *   while invert keeps undefined as "no data".
 *
 * @example
 * ```ts
 * const qualityIndex = minMaxCriterion((model) => {
 *   const entry = benchmarks.find((b) => matchesModel(b.modelId, model.id));
 *   return entry?.score;
 * });
 * ```
 */
export function minMaxCriterion<T extends Model = Model>(
  getValue: (model: T) => number | undefined,
  invert = false,
): ScoringCriterion<T> {
  return (model: T, allModels: T[]) => {
    const value = getValue(model);
    if (value == null) return undefined;
    const values = allModels
      .map((m) => getValue(m))
      .filter((v): v is number => v != null);
    if (values.length === 0) return undefined;
    const { min, max } = range(values);
    const normalized = minMax(value, min, max);
    return invert ? 1 - normalized : normalized;
  };
}

// ---------------------------------------------------------------------------
// Scoring criteria
// ---------------------------------------------------------------------------

/**
 * Cheaper models score higher. Min-max normalized over the model set.
 * Models without pricing data are uncovered (no credit for unknown cost).
 */
export const costEfficiency: ScoringCriterion = (model, allModels) => {
  if (model.cost?.input == null) return undefined;
  const prices = allModels.filter((m) => m.cost?.input != null).map((m) => m.cost!.input);
  if (prices.length === 0) return undefined;
  const { min, max } = range(prices);
  return 1 - minMax(model.cost.input, min, max);
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
 * Newer models score higher based on release date. Min-max normalized
 * over models with a known release date; missing releaseDate is uncovered
 * (a dateless model must not drag the scale down to the epoch).
 */
export const recency: ScoringCriterion = (model, allModels) => {
  const ts = safeTimestamp(model.releaseDate);
  if (ts === 0) return undefined;
  const timestamps = allModels
    .map((m) => safeTimestamp(m.releaseDate))
    .filter((t) => t > 0);
  const { min, max } = range(timestamps);
  return minMax(ts, min, max);
};

/**
 * More recent knowledge cutoff scores higher. Min-max normalized over
 * models with a known cutoff; missing knowledge is uncovered.
 */
export const knowledgeFreshness: ScoringCriterion = (model, allModels) => {
  const toNum = (k?: string) => safeTimestamp(k ? k + "-01" : undefined);
  const value = toNum(model.knowledge);
  if (value === 0) return undefined;
  const values = allModels.map((m) => toNum(m.knowledge)).filter((v) => v > 0);
  const { min, max } = range(values);
  return minMax(value, min, max);
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
 * - Computes weighted sum per model; criteria returning undefined add 0
 * - Attaches coverage: the fraction of weight whose criterion had data
 * - Returns ScoredModel[] sorted by score descending
 * - All-zero weights produce all-zero scores with zero coverage
 */
export function scoreModels<T extends Model>(
  models: T[],
  criteria: WeightedCriterion<T>[],
): ScoredModel<T>[] {
  if (models.length === 0) return [];

  const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0);

  return models
    .map((model) => {
      let score = 0;
      let coveredWeight = 0;
      if (totalWeight > 0) {
        for (const { criterion, weight } of criteria) {
          const value = criterion(model, models);
          if (value != null) {
            score += (weight / totalWeight) * value;
            coveredWeight += weight;
          }
        }
      }
      const coverage = totalWeight > 0 ? coveredWeight / totalWeight : 0;
      return { ...model, score, coverage };
    })
    .sort((a, b) => b.score - a.score);
}

/**
 * Report how many candidates each criterion produced data for.
 *
 * Run this before trusting a profile: a criterion with covered 0 reads a
 * field that exists for no candidate (e.g. a benchmark key that is not in
 * your data) and silently adds nothing to any score.
 */
export function criterionCoverage<T extends Model>(
  models: T[],
  criteria: WeightedCriterion<T>[],
): CriterionCoverage[] {
  return criteria.map(({ criterion, label }, i) => ({
    label: label ?? (criterion.name || `criterion ${i}`),
    covered: models.filter((m) => criterion(m, models) != null).length,
    total: models.length,
  }));
}
