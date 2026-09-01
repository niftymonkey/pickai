// The "what should I consider" path: group, rule, sort, limit, with the steps told.

import type { Model } from "../types";
import type { ModelIdentity } from "../catalog/groupByModel";
import { groupByModel } from "../catalog/groupByModel";
import type { FilterStep } from "../filter/applyRules";
import { applyRules } from "../filter/applyRules";
import type { Rule } from "../filter/rule";
import { toRules } from "./modelFilter";
import type { IdentityComparator } from "../order/comparators";
import { sortByRecency } from "../order/comparators";
import type { ModelFilter } from "./modelFilter";

interface FindOptions {
  /** Declarative filter (compiled to rules) or prebuilt rules, used verbatim. */
  filter?: ModelFilter | Rule[];
  /** Sort comparator. Default: newest release first. */
  sort?: IdentityComparator;
  /** Maximum number of models returned. */
  limit?: number;
}

interface FindResult {
  models: ModelIdentity[];
  steps: FilterStep[];
}

const find = (catalog: Model[], options: FindOptions = {}): FindResult => {
  const { sort = sortByRecency(), limit } = options;
  const identities = groupByModel(catalog);
  // No filter given means no rules at all, as v2 find ruled; {} still excludes deprecated.
  const rules = options.filter === undefined ? [] : toRules(options.filter);
  const { survivors, steps } = applyRules(identities, rules);
  const ordered = [...survivors].sort(sort);
  return { models: limit === undefined ? ordered : ordered.slice(0, limit), steps };
};

export { find };
export type { FindOptions, FindResult };
