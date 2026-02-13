/**
 * Group models by provider with priority ordering.
 *
 * Returns structured groups ready for .map() rendering:
 *
 *   groupByProvider(models).map(group =>
 *     renderSection(group.providerName, group.models)
 *   )
 */

import type { Model } from "./types";
import { formatProviderName } from "./format";

/**
 * A provider group with display name and its models.
 * Generic preserves enrichment: pass EnrichedModel[], get EnrichedModel[] back.
 */
export interface ProviderGroup<T extends Model = Model> {
  /** Provider slug: "anthropic" */
  provider: string;
  /** Human-readable provider name: "Anthropic" */
  providerName: string;
  /** Models belonging to this provider */
  models: T[];
}

/**
 * Group models by provider, sorted alphabetically by default.
 *
 * Pass a `priority` array to pin specific providers to the top
 * (in the order given), with remaining providers alphabetical after.
 *
 * ```typescript
 * const groups = groupByProvider(models);
 * // → alphabetical: [{ provider: "anthropic", ... }, { provider: "deepseek", ... }, ...]
 *
 * // Pin major providers to the top
 * groupByProvider(models, { priority: ["anthropic", "openai", "google"] });
 *
 * groups.map(({ providerName, models }) =>
 *   renderGroup(providerName, models.map(renderItem))
 * )
 * ```
 */
export function groupByProvider<T extends Model>(
  models: T[],
  options?: { priority?: string[] }
): ProviderGroup<T>[] {
  const priority = options?.priority ?? [];

  const byProvider = models.reduce((groups, model) => {
    const existing = groups.get(model.provider);
    if (existing) existing.push(model);
    else groups.set(model.provider, [model]);
    return groups;
  }, new Map<string, T[]>());

  return [...byProvider.keys()]
    .sort((a, b) => {
      const aIdx = priority.indexOf(a);
      const bIdx = priority.indexOf(b);
      if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
      if (aIdx !== -1) return -1;
      if (bIdx !== -1) return 1;
      return a.localeCompare(b);
    })
    .map((provider) => ({
      provider,
      providerName: formatProviderName(provider),
      models: byProvider.get(provider)!,
    }));
}
