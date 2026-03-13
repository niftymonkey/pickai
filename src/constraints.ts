/**
 * Selection constraints.
 *
 * Constraints control which models make the final cut from scored results.
 * They don't affect scores — they filter during selection.
 */

import type { Model, Constraint } from "./types";

/**
 * Constraint: limit models per provider for diversity.
 * Default: max 1 per provider.
 */
export function perProvider(max = 1): Constraint {
  return (selected: Model[], candidate: Model) => {
    const count = selected.filter((m) => m.provider === candidate.provider).length;
    return count < max;
  };
}

/**
 * Constraint: limit models per family for diversity.
 * Models without a family always pass (undefined family is not counted).
 */
export function perFamily(max = 1): Constraint {
  return (selected: Model[], candidate: Model) => {
    if (!candidate.family) return true;
    const count = selected.filter((m) => m.family === candidate.family).length;
    return count < max;
  };
}
