import { expect, test } from "vitest";
import type { FilterStep, Model, ModelIdentity, Rule } from "pickai";
import {
  EMPTY_FACETS,
  biggestCut,
  deriveRules,
  facetSummary,
  searchModels,
  toggled,
  withoutSelection,
} from "../decision";
import type { FacetState } from "../decision";

test("the empty state derives no rules", () => {
  expect(deriveRules(EMPTY_FACETS)).toEqual([]);
});

test("each capability pick derives its own rule, in fixed order", () => {
  const state: FacetState = { ...EMPTY_FACETS, capabilities: ["openWeights", "reasoning"] };
  expect(deriveRules(state)).toEqual([
    { facet: "capability", selection: "reasoning", rule: { kind: "capability", capability: "reasoning" } },
    {
      facet: "capability",
      selection: "openWeights",
      rule: { kind: "capability", capability: "openWeights" },
    },
  ]);
});

test("modality picks derive per-name rules, input before output", () => {
  const state: FacetState = {
    ...EMPTY_FACETS,
    modalities: { input: ["image", "audio"], output: ["text"] },
  };
  expect(deriveRules(state)).toEqual([
    {
      facet: "modality",
      selection: "input:audio",
      rule: { kind: "modality", side: "input", modality: "audio" },
    },
    {
      facet: "modality",
      selection: "input:image",
      rule: { kind: "modality", side: "input", modality: "image" },
    },
    {
      facet: "modality",
      selection: "output:text",
      rule: { kind: "modality", side: "output", modality: "text" },
    },
  ]);
});

test("floors, fences, knowledge, and deprecated each derive their rule", () => {
  expect(deriveRules({ ...EMPTY_FACETS, minContext: 200_000 })).toEqual([
    { facet: "minContext", selection: "value", rule: { kind: "minContext", tokens: 200_000 } },
  ]);
  expect(deriveRules({ ...EMPTY_FACETS, minOutput: 64_000 })).toEqual([
    { facet: "minOutput", selection: "value", rule: { kind: "minOutput", tokens: 64_000 } },
  ]);
  expect(deriveRules({ ...EMPTY_FACETS, fences: { input: 15, output: 50 } })).toEqual([
    { facet: "costFence", selection: "input", rule: { kind: "costFence", side: "input", ceiling: 15 } },
    {
      facet: "costFence",
      selection: "output",
      rule: { kind: "costFence", side: "output", ceiling: 50 },
    },
  ]);
  expect(deriveRules({ ...EMPTY_FACETS, minKnowledge: "2025-06" })).toEqual([
    { facet: "minKnowledge", selection: "value", rule: { kind: "minKnowledge", date: "2025-06" } },
  ]);
  expect(deriveRules({ ...EMPTY_FACETS, excludeDeprecated: true })).toEqual([
    { facet: "excludeDeprecated", selection: "value", rule: { kind: "excludeDeprecated" } },
  ]);
});

test("a roster derives one rule carrying mode and names; an empty roster derives nothing", () => {
  const makers: FacetState = {
    ...EMPTY_FACETS,
    makers: { mode: "exclude", names: ["openai", "google"] },
  };
  expect(deriveRules(makers)).toEqual([
    {
      facet: "makers",
      selection: "roster",
      rule: { kind: "maker", mode: "exclude", makers: ["openai", "google"] },
    },
  ]);
  const sellers: FacetState = { ...EMPTY_FACETS, sellers: { mode: "allow", names: ["anthropic"] } };
  expect(deriveRules(sellers)).toEqual([
    {
      facet: "sellers",
      selection: "roster",
      rule: { kind: "provider", mode: "allow", providers: ["anthropic"] },
    },
  ]);
  expect(deriveRules({ ...EMPTY_FACETS, makers: { mode: "exclude", names: [] } })).toEqual([]);
});

const fullState: FacetState = {
  capabilities: ["toolCall", "reasoning"],
  modalities: { input: ["image"], output: ["text"] },
  minContext: 128_000,
  minOutput: 16_000,
  makers: { mode: "allow", names: ["anthropic"] },
  sellers: { mode: "exclude", names: ["poe"] },
  fences: { input: 5, output: 15 },
  minKnowledge: "2025-01",
  excludeDeprecated: true,
  metricFloor: { metric: "overall", min: 1400 },
};

test("the metric floor derives its rule last in rail order", () => {
  expect(deriveRules({ ...EMPTY_FACETS, metricFloor: { metric: "coding", min: 1450 } })).toEqual([
    {
      facet: "metricFloor",
      selection: "value",
      rule: { kind: "metric", metric: "coding", min: 1450 },
    },
  ]);
});

test("the metric floor summarizes with its display label", () => {
  expect(
    facetSummary({ ...EMPTY_FACETS, metricFloor: { metric: "overall", min: 1400 } }, "metricFloor"),
  ).toBe("Overall at least 1400");
});

test("a full state derives in rail order", () => {
  expect(deriveRules(fullState).map(({ facet, selection }) => `${facet}:${selection}`)).toEqual([
    "capability:reasoning",
    "capability:toolCall",
    "modality:input:image",
    "modality:output:text",
    "minContext:value",
    "minOutput:value",
    "makers:roster",
    "sellers:roster",
    "costFence:input",
    "costFence:output",
    "minKnowledge:value",
    "excludeDeprecated:value",
    "metricFloor:value",
  ]);
});

test("toggled adds a missing name and removes a present one", () => {
  expect(toggled(["a"], "b")).toEqual(["a", "b"]);
  expect(toggled(["a", "b"], "a")).toEqual(["b"]);
});

test("withoutSelection removes exactly the named selection, for every derived rule", () => {
  for (const { facet, selection } of deriveRules(fullState)) {
    const remaining = deriveRules(withoutSelection(fullState, facet, selection));
    expect(remaining).toHaveLength(deriveRules(fullState).length - 1);
    expect(
      remaining.some((entry) => entry.facet === facet && entry.selection === selection),
    ).toBe(false);
  }
});

test("withoutSelection empties a roster whole", () => {
  const next = withoutSelection(fullState, "makers", "roster");
  expect(next.makers).toEqual({ mode: "allow", names: [] });
  expect(next.sellers).toEqual(fullState.sellers);
});

test("an off facet summarizes to null", () => {
  for (const facet of [
    "capability",
    "modality",
    "minContext",
    "minOutput",
    "makers",
    "sellers",
    "costFence",
    "minKnowledge",
    "excludeDeprecated",
    "metricFloor",
  ] as const) {
    expect(facetSummary(EMPTY_FACETS, facet)).toBeNull();
  }
});

test("capabilities join with a plus", () => {
  const state: FacetState = { ...EMPTY_FACETS, capabilities: ["toolCall", "reasoning"] };
  expect(facetSummary(state, "capability")).toBe("Needs reasoning + tool calling");
});

test("modality joins picks and sides", () => {
  const state: FacetState = {
    ...EMPTY_FACETS,
    modalities: { input: ["image", "audio"], output: ["text"] },
  };
  expect(facetSummary(state, "modality")).toBe("Takes audio + image input · Gives text output");
});

test("single-rule facets speak the rule's words", () => {
  expect(facetSummary({ ...EMPTY_FACETS, minContext: 200_000 }, "minContext")).toBe(
    "Context at least 200K",
  );
  expect(
    facetSummary({ ...EMPTY_FACETS, makers: { mode: "allow", names: ["anthropic"] } }, "makers"),
  ).toBe("Only made by anthropic");
  expect(facetSummary({ ...EMPTY_FACETS, fences: { input: 5, output: 15 } }, "costFence")).toBe(
    "Input price at most $5/M · Output price at most $15/M",
  );
  expect(facetSummary({ ...EMPTY_FACETS, minKnowledge: "2025-06" }, "minKnowledge")).toBe(
    "Knows the world since 2025-06",
  );
  expect(facetSummary({ ...EMPTY_FACETS, excludeDeprecated: true }, "excludeDeprecated")).toBe(
    "No deprecated models",
  );
});

const step = (rule: Rule, cutModels: number, cut: number): FilterStep => ({
  rule,
  cut,
  remaining: 0,
  cutModels,
  remainingModels: 0,
});

const noDeprecated: Rule = { kind: "excludeDeprecated" };
const bigContext: Rule = { kind: "minContext", tokens: 128_000 };

test("biggest cut names the heaviest step", () => {
  const heavy = step(bigContext, 7, 21);
  const steps = [step(noDeprecated, 3, 9), heavy, step({ kind: "minOutput", tokens: 64_000 }, 2, 4)];
  expect(biggestCut(steps)).toBe(heavy);
});
test("first wins ties", () => {
  const first = step(noDeprecated, 5, 12);
  expect(biggestCut([first, step(bigContext, 5, 30)])).toBe(first);
});
test("none when no steps", () => {
  expect(biggestCut([])).toBeUndefined();
});
// Fixture ids checked against normalizeModelId: each folds to itself.
const listing = (id: string, name: string, provider: string): Model => ({
  id,
  name,
  provider,
  limit: { context: 128_000, output: 16_384 },
  modalities: { input: ["text"], output: ["text"] },
  openRouterId: `${provider}/${id}`,
});

const identity = (id: string, name: string, maker: string): ModelIdentity => {
  const representative = listing(id, name, maker);
  return { key: id, maker, representative, listings: [representative] };
};

const catalog = [
  identity("gpt-4o", "GPT-4o", "openai"),
  identity("claude-sonnet-4-5", "Claude Sonnet 4.5", "anthropic"),
  identity("grok-4", "Grok 4", "xai"),
];

test("search matches partial names case-insensitively", () => {
  const hits = searchModels(catalog, [], "SONNET");
  expect(hits.map(({ identity: { key } }) => key)).toEqual(["claude-sonnet-4-5"]);
  expect(searchModels(catalog, [], "o").map(({ identity: { key } }) => key)).toEqual([
    "gpt-4o",
    "claude-sonnet-4-5",
    "grok-4",
  ]);
});
test("a cut model reports its cutting rule", () => {
  const neverOpenai: Rule = { kind: "maker", mode: "exclude", makers: ["openai"] };
  const [hit] = searchModels(catalog, [noDeprecated, neverOpenai], "gpt");
  expect(hit.identity.key).toBe("gpt-4o");
  expect(hit.cutBy).toBe(neverOpenai);
});
test("a survivor reports none", () => {
  const neverOpenai: Rule = { kind: "maker", mode: "exclude", makers: ["openai"] };
  const [hit] = searchModels(catalog, [neverOpenai], "grok");
  expect(hit.identity.key).toBe("grok-4");
  expect(hit.cutBy).toBeUndefined();
});
