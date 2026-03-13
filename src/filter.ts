/**
 * Model filtering.
 *
 * Converts a declarative ModelFilter into a predicate and applies it.
 * Also accepts a raw predicate function for custom logic.
 */

import type { Model, ModelFilter } from "./types";

/**
 * Apply a filter to a model array.
 *
 * Accepts either a declarative ModelFilter object or a predicate function.
 * Returns a new array of models that pass the filter.
 */
export function applyFilter<T extends Model>(
  models: T[],
  filter?: ModelFilter | ((model: Model) => boolean),
): T[] {
  if (!filter) return models;

  if (typeof filter === "function") {
    return models.filter(filter);
  }

  const predicate = buildPredicate(filter);
  return models.filter(predicate);
}

function buildPredicate(f: ModelFilter): (model: Model) => boolean {
  return (model: Model) => {
    // Capability flags — only filter when the flag is explicitly true in the filter
    if (f.reasoning === true && !model.reasoning) return false;
    if (f.toolCall === true && !model.toolCall) return false;
    if (f.structuredOutput === true && model.structuredOutput !== true) return false;
    if (f.openWeights === true && !model.openWeights) return false;
    if (f.attachment === true && !model.attachment) return false;

    // Cost bounds — models without cost pass (unknown pricing ≠ expensive)
    if (f.maxCostInput != null && model.cost != null && model.cost.input > f.maxCostInput) return false;
    if (f.maxCostOutput != null && model.cost != null && model.cost.output > f.maxCostOutput) return false;

    // Context/output bounds
    if (f.minContext != null && model.limit.context < f.minContext) return false;
    if (f.minOutput != null && model.limit.output < f.minOutput) return false;

    // Provider filtering
    if (f.providers && !f.providers.includes(model.provider)) return false;
    if (f.excludeProviders && f.excludeProviders.includes(model.provider)) return false;

    // Modality filtering — model must support all requested modalities
    if (f.inputModalities) {
      for (const mod of f.inputModalities) {
        if (!model.modalities.input.includes(mod)) return false;
      }
    }
    if (f.outputModalities) {
      for (const mod of f.outputModalities) {
        if (!model.modalities.output.includes(mod)) return false;
      }
    }

    // Status — excludeDeprecated defaults to true
    if ((f.excludeDeprecated ?? true) && model.status === "deprecated") return false;

    // Knowledge cutoff
    if (f.minKnowledge != null) {
      if (!model.knowledge) return false;
      if (model.knowledge < f.minKnowledge) return false;
    }

    return true;
  };
}
