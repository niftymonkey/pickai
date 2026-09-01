import { describe, it, expect } from "vitest";
import { compileRules } from "../modelFilter";

describe("compileRules", () => {
  it("an empty filter compiles to the deprecated exclusion alone", () => {
    expect(compileRules({})).toEqual([{ kind: "excludeDeprecated" }]);
  });
  it("excludeDeprecated false compiles to no rules at all", () => {
    expect(compileRules({ excludeDeprecated: false })).toEqual([]);
  });

  it("each capability flag compiles to its capability rule", () => {
    const rules = compileRules({
      reasoning: true,
      toolCall: true,
      structuredOutput: true,
      openWeights: true,
      excludeDeprecated: false,
    });
    expect(rules).toEqual([
      { kind: "capability", capability: "reasoning" },
      { kind: "capability", capability: "toolCall" },
      { kind: "capability", capability: "structuredOutput" },
      { kind: "capability", capability: "openWeights" },
    ]);
  });
  it("provider allow and exclude lists compile to provider rules", () => {
    const rules = compileRules({
      providers: ["anthropic", "openai"],
      excludeProviders: ["kilo"],
      excludeDeprecated: false,
    });
    expect(rules).toEqual([
      { kind: "provider", mode: "allow", providers: ["anthropic", "openai"] },
      { kind: "provider", mode: "exclude", providers: ["kilo"] },
    ]);
  });

  it("maker allow and exclude lists compile to maker rules", () => {
    const rules = compileRules({
      makers: ["anthropic"],
      excludeMakers: ["openai"],
      excludeDeprecated: false,
    });
    expect(rules).toEqual([
      { kind: "maker", mode: "allow", makers: ["anthropic"] },
      { kind: "maker", mode: "exclude", makers: ["openai"] },
    ]);
  });
  it("cost ceilings compile to one fence per side", () => {
    const rules = compileRules({ maxCostInput: 10, maxCostOutput: 40, excludeDeprecated: false });
    expect(rules).toEqual([
      { kind: "costFence", side: "input", ceiling: 10 },
      { kind: "costFence", side: "output", ceiling: 40 },
    ]);
  });

  it("context and output floors compile to token rules", () => {
    const rules = compileRules({ minContext: 200000, minOutput: 8192, excludeDeprecated: false });
    expect(rules).toEqual([
      { kind: "minContext", tokens: 200000 },
      { kind: "minOutput", tokens: 8192 },
    ]);
  });

  it("each requested modality compiles to its own rule per side", () => {
    const rules = compileRules({
      inputModalities: ["text", "image"],
      outputModalities: ["text"],
      excludeDeprecated: false,
    });
    expect(rules).toEqual([
      { kind: "modality", side: "input", modality: "text" },
      { kind: "modality", side: "input", modality: "image" },
      { kind: "modality", side: "output", modality: "text" },
    ]);
  });

  it("a knowledge floor compiles to a minKnowledge rule", () => {
    const rules = compileRules({ minKnowledge: "2024-06", excludeDeprecated: false });
    expect(rules).toEqual([{ kind: "minKnowledge", date: "2024-06" }]);
  });
  // Sellers compile first: provider rules prune listings and re-elect the
  // representative, and every later rule judges that representative.
  it("a full filter compiles in the documented order", () => {
    const rules = compileRules({
      minKnowledge: "2025-01",
      maxCostInput: 10,
      minContext: 128000,
      reasoning: true,
      inputModalities: ["image"],
      excludeMakers: ["mistral"],
      excludeProviders: ["kilo"],
    });
    expect(rules.map((rule) => rule.kind)).toEqual([
      "provider",
      "maker",
      "capability",
      "modality",
      "minContext",
      "costFence",
      "minKnowledge",
      "excludeDeprecated",
    ]);
  });
});
