// Where did my model go: the first rule that removes it, found by replay.

import type { ModelIdentity } from "../catalog/groupByModel";
import type { Rule } from "./rule";
import { applyRule } from "./applyRule";

/** A targeted replay over one identity, never a scan of removed lists (finding 9). */
const explainCut = (identity: ModelIdentity, rules: Rule[]): Rule | undefined => {
  let current: ModelIdentity | null = identity;
  for (const rule of rules) {
    current = applyRule(current, rule);
    if (current === null) return rule;
  }
  return undefined;
};

export { explainCut };
