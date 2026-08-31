// The declarative model filter and its compilation into ordered rules.

import type { Capability, Rule } from "../filter/rule";

/** Declarative filter over model identities. All fields are AND-combined. */
interface ModelFilter {
  /** Require reasoning capability */
  reasoning?: boolean;
  /** Require tool/function calling */
  toolCall?: boolean;
  /** Require structured output */
  structuredOutput?: boolean;
  /** Require open weights */
  openWeights?: boolean;
  /** Max input cost per 1M tokens (USD); cuts only a known price above the ceiling */
  maxCostInput?: number;
  /** Max output cost per 1M tokens (USD); cuts only a known price above the ceiling */
  maxCostOutput?: number;
  /** Minimum context window (tokens) */
  minContext?: number;
  /** Minimum output limit (tokens) */
  minOutput?: number;
  /** Keep only models still sold by one of these sellers */
  providers?: string[];
  /** Drop these sellers' listings; a model dies only when no seller remains */
  excludeProviders?: string[];
  /** Keep only models made by one of these makers */
  makers?: string[];
  /** Drop models made by these makers */
  excludeMakers?: string[];
  /** Require these input modalities */
  inputModalities?: string[];
  /** Require these output modalities */
  outputModalities?: string[];
  /** Exclude deprecated models (default: true) */
  excludeDeprecated?: boolean;
  /** Minimum knowledge cutoff: "2024-06" */
  minKnowledge?: string;
}

const CAPABILITY_FLAGS: Capability[] = ["reasoning", "toolCall", "structuredOutput", "openWeights"];

/** The accept-either edge: prebuilt rules pass verbatim, a declarative filter compiles. */
const toRules = (filter: ModelFilter | Rule[]): Rule[] =>
  Array.isArray(filter) ? filter : compileRules(filter);

const compileRules = (filter: ModelFilter): Rule[] => {
  const rules: Rule[] = [];
  if (filter.providers) rules.push({ kind: "provider", mode: "allow", providers: filter.providers });
  if (filter.excludeProviders) {
    rules.push({ kind: "provider", mode: "exclude", providers: filter.excludeProviders });
  }
  if (filter.makers) rules.push({ kind: "maker", mode: "allow", makers: filter.makers });
  if (filter.excludeMakers) rules.push({ kind: "maker", mode: "exclude", makers: filter.excludeMakers });
  for (const capability of CAPABILITY_FLAGS) {
    if (filter[capability] === true) rules.push({ kind: "capability", capability });
  }
  for (const modality of filter.inputModalities ?? []) {
    rules.push({ kind: "modality", side: "input", modality });
  }
  for (const modality of filter.outputModalities ?? []) {
    rules.push({ kind: "modality", side: "output", modality });
  }
  if (filter.minContext !== undefined) rules.push({ kind: "minContext", tokens: filter.minContext });
  if (filter.minOutput !== undefined) rules.push({ kind: "minOutput", tokens: filter.minOutput });
  if (filter.maxCostInput !== undefined) {
    rules.push({ kind: "costFence", side: "input", ceiling: filter.maxCostInput });
  }
  if (filter.maxCostOutput !== undefined) {
    rules.push({ kind: "costFence", side: "output", ceiling: filter.maxCostOutput });
  }
  if (filter.minKnowledge !== undefined) rules.push({ kind: "minKnowledge", date: filter.minKnowledge });
  if (filter.excludeDeprecated ?? true) rules.push({ kind: "excludeDeprecated" });
  return rules;
};

export { compileRules, toRules };
export type { ModelFilter };
