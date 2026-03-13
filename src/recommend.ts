/**
 * Model recommendation.
 *
 * recommend() is the "help me choose" path — scored ranking using a purpose profile.
 * Much simpler than v1: no tier-first architecture. Just filter → score → select.
 */

import type { Model, ScoredModel, PurposeProfile, RecommendOptions, ModelFilter } from "./types";
import { applyFilter } from "./filter";
import { scoreModels } from "./score";
import { selectModels } from "./select";

/**
 * Recommend the best model(s) for a purpose profile.
 *
 * 1. Apply profile filter (if any)
 * 2. Apply options filter (if any) — AND-combined with profile filter
 * 3. Score using profile criteria
 * 4. Select using constraints
 */
export function recommend<T extends Model>(
  models: T[],
  profile: PurposeProfile,
  options: RecommendOptions = {},
): ScoredModel<T>[] {
  const { filter: optionsFilter, constraints, limit = 1 } = options;

  // Step 1: Apply profile filter (always runs through applyFilter so
  // excludeDeprecated defaults to true even for profiles without a filter)
  let candidates: T[] = applyFilter(models, profile.filter ?? {});

  // Step 2: Apply options filter
  if (optionsFilter) {
    candidates = applyFilter(candidates, optionsFilter);
  }

  if (candidates.length === 0) return [];

  // Step 3: Score
  const scored = scoreModels(candidates, profile.criteria);

  // Step 4: Select with constraints
  return selectModels(scored, { limit, constraints });
}
