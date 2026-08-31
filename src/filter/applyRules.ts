// Rules applied in order, each step counted in both units: listings and models.

import type { ModelIdentity } from "../catalog/groupByModel";
import type { Rule } from "./rule";
import { applyRule } from "./applyRule";

interface FilterStep {
  rule: Rule;
  /** Listings this rule cut. */
  cut: number;
  /** Listings still standing after this rule. */
  remaining: number;
  /** Model identities this rule cut. */
  cutModels: number;
  /** Model identities still standing after this rule. */
  remainingModels: number;
}

interface FilterResult {
  survivors: ModelIdentity[];
  steps: FilterStep[];
}

const countListings = (identities: ModelIdentity[]): number =>
  identities.reduce((total, identity) => total + identity.listings.length, 0);

const applyRules = (identities: ModelIdentity[], rules: Rule[]): FilterResult => {
  let remaining = identities;
  const steps: FilterStep[] = [];
  for (const rule of rules) {
    const next: ModelIdentity[] = [];
    for (const identity of remaining) {
      const kept = applyRule(identity, rule);
      if (kept) next.push(kept);
    }
    steps.push({
      rule,
      cut: countListings(remaining) - countListings(next),
      remaining: countListings(next),
      cutModels: remaining.length - next.length,
      remainingModels: next.length,
    });
    remaining = next;
  }
  return { survivors: remaining, steps };
};

export { applyRules };
export type { FilterStep, FilterResult };
