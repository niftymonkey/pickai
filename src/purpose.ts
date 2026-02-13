/**
 * Built-in purpose profiles and the recommend() function.
 *
 * Combines scoring (score.ts) and selection (select.ts) into a single
 * high-level API: recommend(models, "balanced") → top model(s).
 *
 * Key design: `preferredTier` is a hard filter, not a competing weight.
 * Models in the preferred tier are always considered first. Adjacent and
 * distant tiers are only used as fallbacks when the preferred tier can't
 * fill the requested count. This makes tier selection structural and
 * deterministic — the profile weights only control ranking within a tier
 * where models are meaningfully comparable.
 *
 * Weight mappings:
 * - cost → costEfficiency (cheaper is better)
 * - quality → versionFreshness + recency (newer/higher version is better)
 * - context → contextCapacity (larger context is better)
 */

import type { Model, ScoredModel, PurposeProfile, ModelTier, WeightedCriterion } from "./types";
import { Tier } from "./types";
import { classifyTier, isTextFocused } from "./classify";
import { costEfficiency, contextCapacity, recency, versionFreshness, scoreModels } from "./score";
import { providerDiversity } from "./select";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Union of built-in purpose profile names. */
export type PurposeName = "cheap" | "balanced" | "quality" | "coding" | "creative" | "reviewer";

/**
 * Purpose name constants. Use `Purpose.Balanced` instead of raw `"balanced"`.
 */
export const Purpose = {
  Cheap: "cheap" as PurposeName,
  Balanced: "balanced" as PurposeName,
  Quality: "quality" as PurposeName,
  Coding: "coding" as PurposeName,
  Creative: "creative" as PurposeName,
  Reviewer: "reviewer" as PurposeName,
} as const;

/** Options for the recommend() function. */
export interface RecommendOptions {
  /** Number of models to return (default: 1) */
  count?: number;
  /** Prefer different providers when count > 1 (default: false) */
  providerDiversity?: boolean;
  /** Filter to text-focused models only (default: true). Set false to include image/audio/video generators. */
  textOnly?: boolean;
}

// ---------------------------------------------------------------------------
// Built-in purpose profiles
// ---------------------------------------------------------------------------

export const purposes: Record<PurposeName, PurposeProfile> = {
  cheap: {
    preferredTier: Tier.Efficient,
    weights: { cost: 0.6, quality: 0.2, context: 0.2 },
  },
  balanced: {
    preferredTier: Tier.Standard,
    weights: { cost: 0.3, quality: 0.4, context: 0.3 },
  },
  quality: {
    preferredTier: Tier.Flagship,
    weights: { cost: 0.1, quality: 0.7, context: 0.2 },
  },
  coding: {
    preferredTier: Tier.Standard,
    weights: { cost: 0.2, quality: 0.5, context: 0.3 },
    require: { tools: true },
  },
  creative: {
    preferredTier: Tier.Flagship,
    weights: { cost: 0.1, quality: 0.7, context: 0.2 },
  },
  reviewer: {
    preferredTier: Tier.Standard,
    weights: { cost: 0.2, quality: 0.5, context: 0.3 },
    require: { tools: true, minContext: 8000 },
    exclude: {
      tiers: [Tier.Efficient],
      patterns: ["code", "coder", "codex", "vision", "-vl", "omni"],
    },
  },
};

// ---------------------------------------------------------------------------
// Tier distance
// ---------------------------------------------------------------------------

const TIER_ORDER: ModelTier[] = [Tier.Efficient, Tier.Standard, Tier.Flagship];

function tierDistance(a: ModelTier, b: ModelTier): number {
  return Math.abs(TIER_ORDER.indexOf(a) - TIER_ORDER.indexOf(b));
}

// ---------------------------------------------------------------------------
// recommend()
// ---------------------------------------------------------------------------

/**
 * Recommend the best model(s) for a purpose.
 *
 * Accepts a built-in purpose name ("balanced") or a custom PurposeProfile.
 * Filters non-text-focused models by default (set `textOnly: false` to
 * include image/audio/video generators). Applies require/exclude rules
 * from the profile.
 *
 * Tier selection is structural: models in the preferred tier are scored
 * and selected first. Only when the preferred tier can't fill the requested
 * count does selection expand to adjacent tiers, then distant tiers.
 *
 * When count > 1, applies provider diversity by default.
 */
export function recommend<T extends Model>(
  models: T[],
  purpose: PurposeName | PurposeProfile,
  options: RecommendOptions = {}
): ScoredModel<T>[] {
  const { count = 1, providerDiversity: useDiversity = false, textOnly = true } = options;

  // Resolve profile
  const profile: PurposeProfile =
    typeof purpose === "string" ? purposes[purpose] : purpose;

  // Filter models by require/exclude rules
  const filtered = applyFilters(models, profile, textOnly);
  if (filtered.length === 0) return [];

  // Build scoring criteria from profile weights
  const criteria = buildCriteria(profile);

  // Score all filtered models (consistent normalization context)
  const scored = scoreModels(filtered, criteria);

  // Group by tier distance from preferred, then select tier-first
  const tiered = groupByTierDistance(scored, profile.preferredTier);

  // Select with provider diversity if requested
  const constraints =
    count > 1 && useDiversity ? [providerDiversity()] : [];

  return selectFromTierGroups(tiered, count, constraints);
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function applyFilters<T extends Model>(models: T[], profile: PurposeProfile, textOnly: boolean): T[] {
  return models.filter((m) => {
    if (textOnly && !isTextFocused(m)) return false;
    if (profile.require?.tools && !m.capabilities?.tools) return false;
    if (
      profile.require?.minContext &&
      (m.contextWindow ?? 0) < profile.require.minContext
    )
      return false;
    if (profile.exclude?.tiers) {
      const tier = classifyTier(m);
      if (profile.exclude.tiers.some((t) => t === tier)) return false;
    }
    if (profile.exclude?.patterns) {
      const id = m.id.toLowerCase();
      const name = m.name.toLowerCase();
      for (const pattern of profile.exclude.patterns) {
        const p = pattern.toLowerCase();
        if (id.includes(p) || name.includes(p)) return false;
      }
    }
    return true;
  });
}

function buildCriteria(profile: PurposeProfile): WeightedCriterion[] {
  const criteria: WeightedCriterion[] = [];
  if (profile.weights.cost > 0) {
    criteria.push({ criterion: costEfficiency, weight: profile.weights.cost });
  }
  if (profile.weights.quality > 0) {
    // quality = newer/higher version is better (split between version and recency)
    const half = profile.weights.quality / 2;
    criteria.push({ criterion: versionFreshness, weight: half });
    criteria.push({ criterion: recency, weight: half });
  }
  if (profile.weights.context > 0) {
    criteria.push({ criterion: contextCapacity, weight: profile.weights.context });
  }
  return criteria;
}

/** Group scored models into buckets by distance from preferred tier. */
function groupByTierDistance<T extends Model>(
  scored: ScoredModel<T>[],
  preferredTier: ModelTier
): ScoredModel<T>[][] {
  const groups: ScoredModel<T>[][] = [[], [], []]; // distance 0, 1, 2
  for (const m of scored) {
    const d = tierDistance(classifyTier(m), preferredTier);
    groups[d].push(m);
  }
  return groups;
}

/**
 * Select from tier groups: preferred first, then adjacent, then distant.
 * Constraints (e.g., provider diversity) are applied across all groups —
 * a provider used in the preferred tier counts against adjacent/distant tiers.
 */
function selectFromTierGroups<T extends Model>(
  groups: ScoredModel<T>[][],
  count: number,
  constraints: ((selected: Model[], candidate: Model) => boolean)[]
): ScoredModel<T>[] {
  const result: ScoredModel<T>[] = [];

  for (const group of groups) {
    if (result.length >= count) break;
    if (group.length === 0) continue;

    const remaining = count - result.length;

    if (constraints.length === 0) {
      // No constraints: take top N by score
      result.push(...group.slice(0, remaining));
    } else {
      // Two-pass selection aware of previously selected models
      const firstPass: ScoredModel<T>[] = [];
      const skipped: ScoredModel<T>[] = [];

      for (const m of group) {
        if (firstPass.length >= remaining) break;
        const allSelected = [...result, ...firstPass];
        if (constraints.every((c) => c(allSelected, m))) {
          firstPass.push(m);
        } else {
          skipped.push(m);
        }
      }
      // Second pass: fill remaining from skipped (ignoring constraints)
      for (const m of skipped) {
        if (firstPass.length >= remaining) break;
        firstPass.push(m);
      }

      result.push(...firstPass);
    }
  }

  return result.slice(0, count);
}
