import { expect, test } from "vitest";
import type { FilterStep, Model, ModelIdentity, Rule } from "pickai";
import { addRule, biggestCut, removeRule, searchModels, updateRule } from "../decision";

const noDeprecated: Rule = { kind: "excludeDeprecated" };
const bigContext: Rule = { kind: "minContext", tokens: 128_000 };

test("add appends with fresh id", () => {
  const one = addRule([], noDeprecated);
  const two = addRule(one, bigContext);
  expect(two.map(({ rule }) => rule)).toEqual([noDeprecated, bigContext]);
  expect(two[0].id.length).toBeGreaterThan(0);
  expect(two[1].id.length).toBeGreaterThan(0);
  expect(two[1].id).not.toBe(two[0].id);
  expect(one).toHaveLength(1);
});
test("update replaces by id", () => {
  const entries = addRule(addRule([], noDeprecated), bigContext);
  const bigger: Rule = { kind: "minContext", tokens: 200_000 };
  const next = updateRule(entries, entries[1].id, bigger);
  expect(next).toEqual([entries[0], { id: entries[1].id, rule: bigger }]);
  expect(entries[1].rule).toEqual(bigContext);
});
test("remove drops by id", () => {
  const entries = addRule(addRule([], noDeprecated), bigContext);
  expect(removeRule(entries, entries[0].id)).toEqual([entries[1]]);
  expect(entries).toHaveLength(2);
});
test("removing unknown id changes nothing", () => {
  const entries = addRule([], noDeprecated);
  expect(removeRule(entries, "no-such-id")).toEqual(entries);
});
const step = (rule: Rule, cutModels: number, cut: number): FilterStep => ({
  rule,
  cut,
  remaining: 0,
  cutModels,
  remainingModels: 0,
});

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
