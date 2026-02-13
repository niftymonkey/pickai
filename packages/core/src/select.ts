/**
 * Model selection with constraints.
 *
 * Operates on already-scored models (separation of concerns from score.ts).
 * Uses a two-pass algorithm: first pass respects constraints, second pass
 * fills remaining slots ignoring constraints.
 */

import type { Model, ScoredModel, Constraint, SelectionOptions } from "./types";

// ---------------------------------------------------------------------------
// Built-in constraints
// ---------------------------------------------------------------------------

/**
 * Constraint: limit models per provider for diversity.
 * Default: max 1 per provider in first pass.
 */
export function providerDiversity(maxPerProvider = 1): Constraint {
  return (selected: Model[], candidate: Model) => {
    const count = selected.filter(
      (m) => m.provider === candidate.provider
    ).length;
    return count < maxPerProvider;
  };
}

/**
 * Constraint: minimum context window size.
 * Missing contextWindow treated as 0.
 */
export function minContextWindow(tokens: number): Constraint {
  return (_selected: Model[], candidate: Model) => {
    return (candidate.contextWindow ?? 0) >= tokens;
  };
}

// ---------------------------------------------------------------------------
// Selection
// ---------------------------------------------------------------------------

/**
 * Select top models from a pre-scored list.
 *
 * Two-pass algorithm:
 * 1. First pass: iterate scored models, add to result if all constraints pass
 * 2. Second pass: if result < count, fill from remaining models ignoring constraints
 *
 * Models should already be sorted by score descending (as returned by scoreModels).
 */
export function selectModels(
  scored: ScoredModel[],
  options: SelectionOptions = {}
): ScoredModel[] {
  const { count = 1, constraints = [], filter } = options;

  // Apply pre-filter
  const candidates = filter ? scored.filter(filter) : scored;

  if (candidates.length === 0) return [];

  const selected: ScoredModel[] = [];
  const usedInFirstPass = new Set<number>();

  // First pass: respect constraints
  for (let i = 0; i < candidates.length && selected.length < count; i++) {
    const candidate = candidates[i];
    const passesAll = constraints.every((c) => c(selected, candidate));
    if (passesAll) {
      selected.push(candidate);
      usedInFirstPass.add(i);
    }
  }

  // Second pass: fill remaining slots ignoring constraints
  for (
    let i = 0;
    i < candidates.length && selected.length < count;
    i++
  ) {
    if (!usedInFirstPass.has(i)) {
      selected.push(candidates[i]);
    }
  }

  return selected;
}
