// One rule against one model identity: the identity survives, shrinks, or dies.

import type { ModelIdentity } from "../catalog/groupByModel";
import { electRepresentative } from "../catalog/electRepresentative";
import type { Rule } from "./rule";

type RepresentativeRule = Exclude<Rule, { kind: "provider" }>;

const passesRepresentative = (identity: ModelIdentity, rule: RepresentativeRule): boolean => {
  const representative = identity.representative;
  switch (rule.kind) {
    case "capability":
      return representative[rule.capability] === true;
    case "maker": {
      // An unknown maker survives an exclude and fails an allow (finding 14).
      const listed = identity.maker !== null && rule.makers.includes(identity.maker);
      return rule.mode === "allow" ? listed : !listed;
    }
    case "costFence": {
      // The fence cuts only a known price above the ceiling (decision 9.23).
      const price = rule.side === "input" ? representative.cost?.input : representative.cost?.output;
      return price === undefined || price <= rule.ceiling;
    }
    case "modality":
      return representative.modalities[rule.side].includes(rule.modality);
    case "minContext":
      return representative.limit.context >= rule.tokens;
    case "minOutput":
      return representative.limit.output >= rule.tokens;
    case "minKnowledge":
      // Unlike price, unknown knowledge fails the floor, as v2 always ruled.
      return representative.knowledge !== undefined && representative.knowledge >= rule.date;
    case "excludeDeprecated":
      return representative.status !== "deprecated";
    case "metric": {
      // A model missing the metric survives the rule and stays unrated (9.34).
      const value = identity.metrics?.[rule.metric];
      if (value === undefined) return true;
      if (rule.min !== undefined && value < rule.min) return false;
      if (rule.max !== undefined && value > rule.max) return false;
      return true;
    }
  }
};

/**
 * Provider rules are about who you will buy from, so they prune seller
 * listings and re-elect; the model dies only when no acceptable seller
 * remains (finding 12). Every other rule judges the representative.
 */
const applyRule = <T extends ModelIdentity>(identity: T, rule: Rule): T | null => {
  if (rule.kind === "provider") {
    const kept = identity.listings.filter((candidate) =>
      rule.mode === "allow"
        ? rule.providers.includes(candidate.provider)
        : !rule.providers.includes(candidate.provider),
    );
    if (kept.length === 0) return null;
    if (kept.length === identity.listings.length) return identity;
    return {
      ...identity,
      representative: electRepresentative(kept, identity.maker),
      listings: kept,
    };
  }
  return passesRepresentative(identity, rule) ? identity : null;
};

export { applyRule };
