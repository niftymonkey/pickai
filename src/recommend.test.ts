import { describe, it, expect } from "vitest";
import { recommend } from "./recommend";
import { costEfficiency, recency, contextCapacity, knowledgeFreshness } from "./score";
import { perProvider, perFamily } from "./constraints";
import { fixtures, allModels } from "./test-utils";
import type { PurposeProfile } from "./types";

const cheapProfile: PurposeProfile = {
  criteria: [
    { criterion: costEfficiency, weight: 7 },
    { criterion: contextCapacity, weight: 3 },
  ],
};

const codingProfile: PurposeProfile = {
  filter: { toolCall: true, structuredOutput: true },
  criteria: [
    { criterion: recency, weight: 4 },
    { criterion: knowledgeFreshness, weight: 3 },
    { criterion: contextCapacity, weight: 3 },
    { criterion: costEfficiency, weight: 1 },
  ],
};

const reasoningProfile: PurposeProfile = {
  filter: { reasoning: true },
  criteria: [
    { criterion: recency, weight: 5 },
    { criterion: knowledgeFreshness, weight: 3 },
    { criterion: contextCapacity, weight: 2 },
    { criterion: costEfficiency, weight: 1 },
  ],
};

describe("recommend", () => {
  it("returns default limit of 1", () => {
    const result = recommend(allModels, cheapProfile);
    expect(result).toHaveLength(1);
  });

  it("applies profile filter", () => {
    const result = recommend(allModels, codingProfile, { limit: 10 });
    // All results should have toolCall and structuredOutput
    for (const m of result) {
      expect(m.toolCall).toBe(true);
      expect(m.structuredOutput).toBe(true);
    }
  });

  it("applies options filter combined with profile filter", () => {
    const result = recommend(allModels, codingProfile, {
      filter: { providers: ["anthropic"] },
      limit: 10,
    });
    for (const m of result) {
      expect(m.provider).toBe("anthropic");
      expect(m.toolCall).toBe(true);
    }
  });

  it("passes constraints through to selectModels", () => {
    const result = recommend(allModels, cheapProfile, {
      constraints: [perProvider(1)],
      limit: 5,
    });
    // Should have at most 1 per provider in first pass
    const providers = result.map((m) => m.provider);
    // With 5 results and the two-pass algorithm, first pass gives unique providers
    const firstThree = providers.slice(0, 3);
    expect(new Set(firstThree).size).toBe(3); // at least 3 unique in first pass
  });

  it("cheap profile returns cheapest model", () => {
    const result = recommend(allModels, cheapProfile);
    // flash ($0.075) is cheapest
    expect(result[0].id).toBe(fixtures.flash.id);
  });

  it("coding profile filters to toolCall+structuredOutput models", () => {
    const result = recommend(allModels, codingProfile, { limit: 20 });
    // deepseekR1 has no toolCall or structuredOutput, should be excluded
    expect(result.find((m) => m.id === "deepseek-r1")).toBeUndefined();
  });

  it("reasoning profile filters to reasoning models", () => {
    const result = recommend(allModels, reasoningProfile, { limit: 20 });
    expect(result.every((m) => m.reasoning === true)).toBe(true);
  });

  it("excludes deprecated models even without profile filter", () => {
    const modelsWithDeprecated = [...allModels, fixtures.deprecated];
    const result = recommend(modelsWithDeprecated, cheapProfile, { limit: 20 });
    expect(result.find((m) => m.status === "deprecated")).toBeUndefined();
  });

  it("returns empty array when no models match filter", () => {
    const impossible: PurposeProfile = {
      filter: { providers: ["nonexistent"] },
      criteria: [{ criterion: costEfficiency, weight: 1 }],
    };
    const result = recommend(allModels, impossible);
    expect(result).toEqual([]);
  });

  it("custom profile works", () => {
    const customProfile: PurposeProfile = {
      filter: { reasoning: true, toolCall: true },
      criteria: [
        { criterion: contextCapacity, weight: 3 },
        { criterion: costEfficiency, weight: 1 },
      ],
    };
    const result = recommend(allModels, customProfile, { limit: 3 });
    expect(result.length).toBeGreaterThan(0);
    for (const m of result) {
      expect(m.reasoning).toBe(true);
      expect(m.toolCall).toBe(true);
    }
  });

  it("scored results have score property", () => {
    const result = recommend(allModels, cheapProfile, { limit: 3 });
    for (const m of result) {
      expect(m.score).toBeDefined();
      expect(m.score).toBeGreaterThanOrEqual(0);
      expect(m.score).toBeLessThanOrEqual(1);
    }
  });

  it("results are sorted by score descending", () => {
    const result = recommend(allModels, cheapProfile, { limit: 5 });
    for (let i = 0; i < result.length - 1; i++) {
      expect(result[i].score).toBeGreaterThanOrEqual(result[i + 1].score);
    }
  });
});
