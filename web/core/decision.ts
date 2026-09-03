// The decision in progress: the facet rows' state, and the rules and words derived from it.

import { explainCut, ruleLabel } from "pickai";
import type { Capability, FilterStep, ModelIdentity, Rule } from "pickai";

type RosterMode = "allow" | "exclude";

interface Roster {
  mode: RosterMode;
  names: string[];
}

/** One rail row's identity; row order is the pipeline order. */
type Facet =
  | "capability"
  | "modality"
  | "minContext"
  | "minOutput"
  | "makers"
  | "sellers"
  | "costFence"
  | "minKnowledge"
  | "excludeDeprecated";

/** The whole rail's live state; every row is present, active or not. */
interface FacetState {
  capabilities: Capability[];
  modalities: { input: string[]; output: string[] };
  minContext: number | null;
  minOutput: number | null;
  makers: Roster;
  sellers: Roster;
  fences: { input: number | null; output: number | null };
  minKnowledge: string | null;
  excludeDeprecated: boolean;
}

const EMPTY_FACETS: FacetState = {
  capabilities: [],
  modalities: { input: [], output: [] },
  minContext: null,
  minOutput: null,
  makers: { mode: "allow", names: [] },
  sellers: { mode: "allow", names: [] },
  fences: { input: null, output: null },
  minKnowledge: null,
  excludeDeprecated: false,
};

/** One derived rule, addressable by its row and the selection within it. */
interface DerivedRule {
  facet: Facet;
  selection: string;
  rule: Rule;
}

// Derivation order within the capability row is fixed so the pipeline never reorders.
const CAPABILITY_ORDER: Capability[] = [
  "reasoning",
  "toolCall",
  "structuredOutput",
  "openWeights",
];

const CAPABILITY_WORDS: Record<Capability, string> = {
  reasoning: "reasoning",
  toolCall: "tool calling",
  structuredOutput: "structured output",
  openWeights: "open weights",
};

const orderedCapabilities = (picked: Capability[]): Capability[] =>
  CAPABILITY_ORDER.filter((capability) => picked.includes(capability));

const modalityRules = (state: FacetState, side: "input" | "output"): DerivedRule[] =>
  [...state.modalities[side]].sort().map((modality) => ({
    facet: "modality",
    selection: `${side}:${modality}`,
    rule: { kind: "modality", side, modality },
  }));

const rosterRule = (facet: "makers" | "sellers", roster: Roster): DerivedRule[] => {
  if (roster.names.length === 0) return [];
  const rule: Rule =
    facet === "makers"
      ? { kind: "maker", mode: roster.mode, makers: roster.names }
      : { kind: "provider", mode: roster.mode, providers: roster.names };
  return [{ facet, selection: "roster", rule }];
};

const fenceRule = (state: FacetState, side: "input" | "output"): DerivedRule[] => {
  const ceiling = state.fences[side];
  if (ceiling === null) return [];
  return [{ facet: "costFence", selection: side, rule: { kind: "costFence", side, ceiling } }];
};

const deriveRules = (state: FacetState): DerivedRule[] => [
  ...orderedCapabilities(state.capabilities).map(
    (capability): DerivedRule => ({
      facet: "capability",
      selection: capability,
      rule: { kind: "capability", capability },
    }),
  ),
  ...modalityRules(state, "input"),
  ...modalityRules(state, "output"),
  ...(state.minContext === null
    ? []
    : [
        {
          facet: "minContext",
          selection: "value",
          rule: { kind: "minContext", tokens: state.minContext },
        } satisfies DerivedRule,
      ]),
  ...(state.minOutput === null
    ? []
    : [
        {
          facet: "minOutput",
          selection: "value",
          rule: { kind: "minOutput", tokens: state.minOutput },
        } satisfies DerivedRule,
      ]),
  ...rosterRule("makers", state.makers),
  ...rosterRule("sellers", state.sellers),
  ...fenceRule(state, "input"),
  ...fenceRule(state, "output"),
  ...(state.minKnowledge === null
    ? []
    : [
        {
          facet: "minKnowledge",
          selection: "value",
          rule: { kind: "minKnowledge", date: state.minKnowledge },
        } satisfies DerivedRule,
      ]),
  ...(state.excludeDeprecated
    ? [
        {
          facet: "excludeDeprecated",
          selection: "value",
          rule: { kind: "excludeDeprecated" },
        } satisfies DerivedRule,
      ]
    : []),
];

const toggled = <T extends string>(names: T[], name: T): T[] =>
  names.includes(name) ? names.filter((candidate) => candidate !== name) : [...names, name];

const withoutSelection = (state: FacetState, facet: Facet, selection: string): FacetState => {
  switch (facet) {
    case "capability":
      return {
        ...state,
        capabilities: state.capabilities.filter((capability) => capability !== selection),
      };
    case "modality": {
      const [side, modality] = selection.split(":") as ["input" | "output", string];
      return {
        ...state,
        modalities: {
          ...state.modalities,
          [side]: state.modalities[side].filter((candidate) => candidate !== modality),
        },
      };
    }
    case "minContext":
      return { ...state, minContext: null };
    case "minOutput":
      return { ...state, minOutput: null };
    case "makers":
      return { ...state, makers: { ...state.makers, names: [] } };
    case "sellers":
      return { ...state, sellers: { ...state.sellers, names: [] } };
    case "costFence":
      return { ...state, fences: { ...state.fences, [selection]: null } };
    case "minKnowledge":
      return { ...state, minKnowledge: null };
    case "excludeDeprecated":
      return { ...state, excludeDeprecated: false };
  }
};

const sideSummary = (side: "input" | "output", picked: string[]): string[] => {
  if (picked.length === 0) return [];
  const names = [...picked].sort().join(" + ");
  return [side === "input" ? `Takes ${names} input` : `Gives ${names} output`];
};

/** The collapsed row's sentence; null when the row holds no rule. */
const facetSummary = (state: FacetState, facet: Facet): string | null => {
  switch (facet) {
    case "capability": {
      const picked = orderedCapabilities(state.capabilities);
      if (picked.length === 0) return null;
      return `Needs ${picked.map((capability) => CAPABILITY_WORDS[capability]).join(" + ")}`;
    }
    case "modality": {
      const parts = [
        ...sideSummary("input", state.modalities.input),
        ...sideSummary("output", state.modalities.output),
      ];
      return parts.length === 0 ? null : parts.join(" · ");
    }
    case "costFence": {
      const parts = [...fenceRule(state, "input"), ...fenceRule(state, "output")].map(({ rule }) =>
        ruleLabel(rule),
      );
      return parts.length === 0 ? null : parts.join(" · ");
    }
    default: {
      const derived = deriveRules(state).filter((entry) => entry.facet === facet);
      return derived.length === 0 ? null : derived.map(({ rule }) => ruleLabel(rule)).join(" · ");
    }
  }
};

interface SearchHit {
  identity: ModelIdentity;
  /** The rule that cut this model; undefined for a survivor. */
  cutBy: Rule | undefined;
}

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

/** Every row, in rail order: the vocabulary a whole-state diff walks. */
const ALL_FACETS: Facet[] = [
  "capability",
  "modality",
  "minContext",
  "minOutput",
  "costFence",
  "makers",
  "sellers",
  "minKnowledge",
  "excludeDeprecated",
];

/**
 * The one row whose state moved between two rail states, so the change note can name
 * it. Null when nothing moved or when several rows did, because a note that names the
 * wrong rule is worse than no note.
 */
const changedFacet = (before: FacetState, after: FacetState): Facet | null => {
  const moved = ALL_FACETS.filter(
    (facet) => facetSummary(before, facet) !== facetSummary(after, facet),
  );
  return moved.length === 1 ? moved[0] : null;
};

export {
  EMPTY_FACETS,
  CAPABILITY_ORDER,
  deriveRules,
  toggled,
  withoutSelection,
  facetSummary,
  changedFacet,
  biggestCut,
  searchModels,
};
export type { Facet, FacetState, Roster, RosterMode, DerivedRule, SearchHit };
