/**
 * Model selection with constraints.
 *
 * Operates on already-scored models (separation of concerns from score.ts).
 * Uses a two-pass algorithm: first pass respects constraints, second pass
 * fills remaining slots ignoring constraints.
 */

import type { Model, ScoredModel, Constraint } from "./types";

/** Options for selectModels. */
export interface SelectOptions {
  /** Number of models to select (default: 1) */
  limit?: number;
  /** Constraints to apply during selection */
  constraints?: Constraint[];
}

/**
 * Select top models from a pre-scored list.
 *
 * Two-pass algorithm:
 * 1. First pass: iterate scored models, add to result if all constraints pass
 * 2. Second pass: if result < limit, fill from remaining models ignoring constraints
 *
 * Models should already be sorted by score descending (as returned by scoreModels).
 */
export function selectModels<T extends Model>(
  scored: ScoredModel<T>[],
  options: SelectOptions = {},
): ScoredModel<T>[] {
  const { limit = 1, constraints = [] } = options;

  if (scored.length === 0) return [];

  const selected: ScoredModel<T>[] = [];
  const usedInFirstPass = new Set<number>();

  // First pass: respect constraints
  for (let i = 0; i < scored.length && selected.length < limit; i++) {
    const candidate = scored[i];
    const passesAll = constraints.every((c) => c(selected, candidate));
    if (passesAll) {
      selected.push(candidate);
      usedInFirstPass.add(i);
    }
  }

  // Second pass: fill remaining slots ignoring constraints
  for (let i = 0; i < scored.length && selected.length < limit; i++) {
    if (!usedInFirstPass.has(i)) {
      selected.push(scored[i]);
    }
  }

  return selected;
}
