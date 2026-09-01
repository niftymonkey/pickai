// The decision in progress: rules held with stable ids, and the questions asked of them.

import { explainCut } from "pickai";
import type { FilterStep, ModelIdentity, Rule } from "pickai";

interface RuleEntry {
  id: string;
  rule: Rule;
}

interface SearchHit {
  identity: ModelIdentity;
  /** The rule that cut this model; undefined for a survivor. */
  cutBy: Rule | undefined;
}

const addRule = (entries: RuleEntry[], rule: Rule): RuleEntry[] => [
  ...entries,
  { id: crypto.randomUUID(), rule },
];

const updateRule = (entries: RuleEntry[], id: string, rule: Rule): RuleEntry[] =>
  entries.map((entry) => (entry.id === id ? { id, rule } : entry));

const removeRule = (entries: RuleEntry[], id: string): RuleEntry[] =>
  entries.filter((entry) => entry.id !== id);

const biggestCut = (steps: FilterStep[]): FilterStep | undefined =>
  steps.length === 0
    ? undefined
    : steps.reduce((top, candidate) => (candidate.cutModels > top.cutModels ? candidate : top));

const searchModels = (identities: ModelIdentity[], rules: Rule[], query: string): SearchHit[] => {
  const needle = query.trim().toLowerCase();
  if (needle === "") return [];
  return identities
    .filter(({ representative }) => representative.name.toLowerCase().includes(needle))
    .map((identity) => ({ identity, cutBy: explainCut(identity, rules) }));
};

export { addRule, updateRule, removeRule, biggestCut, searchModels };
export type { RuleEntry, SearchHit };
