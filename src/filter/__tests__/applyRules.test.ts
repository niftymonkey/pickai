import { describe, it, expect, test } from "vitest";
import { applyRules } from "../applyRules";

/** A listing as the catalog carries it, shaped by hand to keep the test fence honest. */
const listing = (
  id: string,
  provider: string,
  extra: Record<string, unknown> = {},
) => ({
  id,
  name: id,
  provider,
  limit: { context: 200000, output: 8192 },
  modalities: { input: ["text"], output: ["text"] },
  openRouterId: `${provider}/${id}`,
  ...extra,
});

type Listing = ReturnType<typeof listing>;

/** An identity as groupByModel would build it: representative first unless said otherwise. */
const identity = (
  key: string,
  maker: string | null,
  listings: Listing[],
  representative: Listing = listings[0],
) => ({ key, maker, representative, listings });

describe("applyRules", () => {
  it("survives everything and reports no steps when there are no rules", () => {
    const claude = identity("claude-opus-5", "anthropic", [listing("claude-opus-5", "anthropic")]);
    const result = applyRules([claude], []);
    expect(result.survivors).toEqual([claude]);
    expect(result.steps).toEqual([]);
  });
  it("a capability rule cuts a model whose representative lacks the flag", () => {
    const tools = identity("gpt-5-2", "openai", [listing("gpt-5.2", "openai", { toolCall: true })]);
    const noTools = identity("davinci-002", "openai", [listing("davinci-002", "openai")]);
    const result = applyRules([tools, noTools], [{ kind: "capability", capability: "toolCall" }]);
    expect(result.survivors).toEqual([tools]);
  });
  it("each step counts both units: listings and models, in rule order", () => {
    const claude = identity("claude-opus-5", "anthropic", [
      listing("claude-opus-5", "anthropic", { toolCall: true }),
      listing("openrouter/claude-opus-5", "openrouter", { toolCall: true }),
    ]);
    const davinci = identity("davinci-002", "openai", [listing("davinci-002", "openai")]);
    const result = applyRules([claude, davinci], [
      { kind: "capability", capability: "toolCall" },
      { kind: "provider", mode: "exclude", providers: ["openrouter"] },
    ]);
    expect(result.steps).toHaveLength(2);
    expect(result.steps[0]).toMatchObject({ cut: 1, remaining: 2, cutModels: 1, remainingModels: 1 });
    expect(result.steps[1]).toMatchObject({ cut: 1, remaining: 1, cutModels: 0, remainingModels: 1 });
  });
  it("a provider exclude prunes sellers, keeps the model, and re-elects the representative", () => {
    const anthropic = listing("claude-opus-5", "anthropic", { cost: { input: 15, output: 75 } });
    const reseller = listing("openrouter/claude-opus-5", "openrouter", { cost: { input: 12, output: 60 } });
    const claude = identity("claude-opus-5", "anthropic", [anthropic, reseller]);
    const result = applyRules([claude], [{ kind: "provider", mode: "exclude", providers: ["anthropic"] }]);
    expect(result.survivors).toHaveLength(1);
    expect(result.survivors[0].listings).toEqual([reseller]);
    expect(result.survivors[0].representative).toBe(reseller);
  });
  it("a provider exclude kills the model only when no acceptable seller remains", () => {
    const claude = identity("claude-opus-5", "anthropic", [
      listing("claude-opus-5", "anthropic"),
      listing("openrouter/claude-opus-5", "openrouter"),
    ]);
    const result = applyRules([claude], [
      { kind: "provider", mode: "exclude", providers: ["anthropic", "openrouter"] },
    ]);
    expect(result.survivors).toEqual([]);
    expect(result.steps[0]).toMatchObject({ cut: 2, remaining: 0, cutModels: 1, remainingModels: 0 });
  });
  it("a reseller-only provider cut reports cut listings and zero cut models", () => {
    // A rule can cut hundreds of listings and zero models (finding 11).
    const claude = identity("claude-opus-5", "anthropic", [
      listing("claude-opus-5", "anthropic"),
      listing("openrouter/claude-opus-5", "openrouter"),
      listing("nano-gpt/claude-opus-5", "nano-gpt"),
    ]);
    const result = applyRules([claude], [
      { kind: "provider", mode: "exclude", providers: ["openrouter", "nano-gpt"] },
    ]);
    expect(result.steps[0]).toMatchObject({ cut: 2, remaining: 1, cutModels: 0, remainingModels: 1 });
  });
  it("a provider allow keeps only listed sellers", () => {
    const claude = identity("claude-opus-5", "anthropic", [
      listing("claude-opus-5", "anthropic"),
      listing("openrouter/claude-opus-5", "openrouter"),
    ]);
    const result = applyRules([claude], [{ kind: "provider", mode: "allow", providers: ["anthropic"] }]);
    expect(result.survivors[0].listings.map((entry) => entry.provider)).toEqual(["anthropic"]);
  });
  it("a maker exclude kills the model whoever sells it, and an unknown maker survives", () => {
    // Finding 14: "never made by anthropic" kills Claude on every seller,
    // while a model with no known maker stays alive under an exclude.
    const claude = identity("claude-opus-5", "anthropic", [
      listing("openrouter/claude-opus-5", "openrouter"),
    ]);
    const mystery = identity("duo-standard", null, [listing("duo-standard", "gitlab")]);
    const result = applyRules([claude, mystery], [
      { kind: "maker", mode: "exclude", makers: ["anthropic"] },
    ]);
    expect(result.survivors).toEqual([mystery]);
  });
  it("a maker allow keeps only listed makers, and an unknown maker fails", () => {
    const claude = identity("claude-opus-5", "anthropic", [listing("claude-opus-5", "anthropic")]);
    const mystery = identity("duo-standard", null, [listing("duo-standard", "gitlab")]);
    const result = applyRules([claude, mystery], [
      { kind: "maker", mode: "allow", makers: ["anthropic"] },
    ]);
    expect(result.survivors).toEqual([claude]);
  });
  it("the cost fence cuts a known price above the ceiling and never an unknown price", () => {
    // Decision 9.23: the fence is an outlier cut; unknown pricing is never cut.
    const pricey = identity("gpt-5-2-pro", "openai", [
      listing("gpt-5.2-pro", "openai", { cost: { input: 120, output: 480 } }),
    ]);
    const unknown = identity("duo-standard", null, [listing("duo-standard", "gitlab")]);
    const cheap = identity("gemini-3-flash", "google", [
      listing("gemini-3-flash", "google", { cost: { input: 0.3, output: 1.2 } }),
    ]);
    const result = applyRules([pricey, unknown, cheap], [
      { kind: "costFence", side: "input", ceiling: 50 },
    ]);
    expect(result.survivors).toEqual([unknown, cheap]);
  });
  it("minContext and minOutput judge the representative's limits", () => {
    const small = identity("gemma-2-9b", "google", [
      listing("gemma-2-9b", "google", { limit: { context: 8192, output: 2048 } }),
    ]);
    const big = identity("gemini-3-pro", "google", [
      listing("gemini-3-pro", "google", { limit: { context: 1000000, output: 65536 } }),
    ]);
    expect(applyRules([small, big], [{ kind: "minContext", tokens: 100000 }]).survivors).toEqual([big]);
    expect(applyRules([small, big], [{ kind: "minOutput", tokens: 16384 }]).survivors).toEqual([big]);
  });
  it("a modality rule judges the asked side", () => {
    const textOnly = identity("davinci-002", "openai", [listing("davinci-002", "openai")]);
    const vision = identity("gemini-3-pro", "google", [
      listing("gemini-3-pro", "google", {
        modalities: { input: ["text", "image"], output: ["text", "image"] },
      }),
    ]);
    expect(applyRules([textOnly, vision], [{ kind: "modality", side: "input", modality: "image" }]).survivors).toEqual([vision]);
    expect(applyRules([textOnly, vision], [{ kind: "modality", side: "output", modality: "image" }]).survivors).toEqual([vision]);
  });
  it("minKnowledge cuts unknown knowledge and older cutoffs", () => {
    const fresh = identity("gpt-5-2", "openai", [listing("gpt-5.2", "openai", { knowledge: "2025-08" })]);
    const stale = identity("davinci-002", "openai", [listing("davinci-002", "openai", { knowledge: "2021-06" })]);
    const unknown = identity("duo-standard", null, [listing("duo-standard", "gitlab")]);
    const result = applyRules([fresh, stale, unknown], [{ kind: "minKnowledge", date: "2024-01" }]);
    expect(result.survivors).toEqual([fresh]);
  });
  it("excludeDeprecated cuts deprecated models", () => {
    const active = identity("gpt-5-2", "openai", [listing("gpt-5.2", "openai", { status: "active" })]);
    const dead = identity("davinci-002", "openai", [listing("davinci-002", "openai", { status: "deprecated" })]);
    const result = applyRules([active, dead], [{ kind: "excludeDeprecated" }]);
    expect(result.survivors).toEqual([active]);
  });
  it("a later rule judges the representative elected by an earlier provider rule", () => {
    // Once the maker's seller is excluded, the cost fence must see the
    // re-elected representative's price, not the dead anchor's (finding 12).
    const anthropic = listing("claude-opus-5", "anthropic", { cost: { input: 15, output: 75 } });
    const reseller = listing("openrouter/claude-opus-5", "openrouter", { cost: { input: 80, output: 320 } });
    const claude = identity("claude-opus-5", "anthropic", [anthropic, reseller]);
    const result = applyRules([claude], [
      { kind: "provider", mode: "exclude", providers: ["anthropic"] },
      { kind: "costFence", side: "input", ceiling: 50 },
    ]);
    expect(result.survivors).toEqual([]);
    expect(result.steps[1]).toMatchObject({ cutModels: 1, remainingModels: 0 });
  });
});
