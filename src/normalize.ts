/**
 * Model-level normalization across provider entries.
 *
 * Catalog data is reported per provider entry, and entries for the same
 * physical model can disagree. These helpers resolve per-model facts
 * before entry-level operations (filtering, splitting) rely on them.
 */

import type { Model } from "./types";
import { normalizeModelId } from "./identity/normalizeModelId";

/**
 * Normalize openWeights across all entries of the same model.
 *
 * If any provider entry reports openWeights true, every entry for that
 * model gets true (weights are either public or they are not). Models
 * with no true entry are returned unchanged.
 */
export function normalizeOpenWeights<T extends Model>(models: T[]): T[] {
  const open = new Set<string>();
  for (const m of models) {
    if (m.openWeights) open.add(normalizeModelId(m.id));
  }
  return models.map((m) =>
    !m.openWeights && open.has(normalizeModelId(m.id)) ? { ...m, openWeights: true } : m,
  );
}
