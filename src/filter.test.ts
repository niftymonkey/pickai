import { describe, it, expect } from "vitest";
import { applyFilter } from "./filter";
import { createModel, fixtures, allModels } from "./test-utils";

describe("applyFilter", () => {
  describe("no filter", () => {
    it("returns all models when filter is undefined", () => {
      expect(applyFilter(allModels)).toHaveLength(allModels.length);
    });
  });

  describe("predicate function", () => {
    it("applies a custom predicate", () => {
      const result = applyFilter(allModels, (m) => m.provider === "anthropic");
      expect(result.every((m) => m.provider === "anthropic")).toBe(true);
      expect(result).toHaveLength(3); // opus, sonnet, haiku
    });
  });

  describe("capability filters", () => {
    it("filters by reasoning", () => {
      const result = applyFilter(allModels, { reasoning: true });
      expect(result.every((m) => m.reasoning === true)).toBe(true);
    });

    it("filters by toolCall", () => {
      const result = applyFilter(allModels, { toolCall: true });
      expect(result.every((m) => m.toolCall === true)).toBe(true);
      // deepseekR1 has no toolCall, should be excluded
      expect(result.find((m) => m.id === "deepseek-r1")).toBeUndefined();
    });

    it("filters by structuredOutput (only matches explicitly true)", () => {
      const withSo = createModel({ id: "with-so", structuredOutput: true });
      const withoutSo = createModel({ id: "without-so" });
      const result = applyFilter([withSo, withoutSo], { structuredOutput: true });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("with-so");
    });

    it("filters by openWeights", () => {
      const result = applyFilter(allModels, { openWeights: true });
      expect(result.every((m) => m.openWeights === true)).toBe(true);
      expect(result).toHaveLength(1); // deepseekR1
    });
  });

  describe("cost filters", () => {
    it("filters by maxCostInput", () => {
      const result = applyFilter(allModels, { maxCostInput: 5 });
      // Should include models with cost.input <= 5 or no cost
      for (const m of result) {
        if (m.cost) expect(m.cost.input).toBeLessThanOrEqual(5);
      }
    });

    it("filters by maxCostOutput", () => {
      const result = applyFilter(allModels, { maxCostOutput: 10 });
      for (const m of result) {
        if (m.cost) expect(m.cost.output).toBeLessThanOrEqual(10);
      }
    });

    it("models without cost pass cost filters", () => {
      const noCost = createModel({ id: "no-cost", cost: undefined });
      const expensive = createModel({ id: "expensive", cost: { input: 100, output: 200 } });
      const result = applyFilter([noCost, expensive], { maxCostInput: 5 });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("no-cost");
    });
  });

  describe("context/output bounds", () => {
    it("filters by minContext", () => {
      const result = applyFilter(allModels, { minContext: 200_000 });
      expect(result.every((m) => m.limit.context >= 200_000)).toBe(true);
    });

    it("filters by minOutput", () => {
      const result = applyFilter(allModels, { minOutput: 32_000 });
      expect(result.every((m) => m.limit.output >= 32_000)).toBe(true);
    });
  });

  describe("provider filters", () => {
    it("includes only specified providers", () => {
      const result = applyFilter(allModels, { providers: ["anthropic", "google"] });
      expect(result.every((m) => ["anthropic", "google"].includes(m.provider))).toBe(true);
    });

    it("excludes specified providers", () => {
      const result = applyFilter(allModels, { excludeProviders: ["openai"] });
      expect(result.every((m) => m.provider !== "openai")).toBe(true);
    });
  });

  describe("modality filters", () => {
    it("filters by inputModalities", () => {
      const result = applyFilter(allModels, { inputModalities: ["image"] });
      expect(result.every((m) => m.modalities.input.includes("image"))).toBe(true);
    });

    it("filters by outputModalities", () => {
      const imageModel = createModel({
        id: "img",
        modalities: { input: ["text"], output: ["image"] },
      });
      const result = applyFilter([...allModels, imageModel], { outputModalities: ["image"] });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("img");
    });
  });

  describe("excludeDeprecated", () => {
    const withDeprecated = [...allModels, fixtures.deprecated];

    it("excludes deprecated by default", () => {
      const result = applyFilter(withDeprecated, {});
      expect(result.find((m) => m.status === "deprecated")).toBeUndefined();
    });

    it("includes deprecated when excludeDeprecated is false", () => {
      const result = applyFilter(withDeprecated, { excludeDeprecated: false });
      expect(result.find((m) => m.status === "deprecated")).toBeDefined();
    });
  });

  describe("minKnowledge", () => {
    it("filters by minimum knowledge cutoff", () => {
      const result = applyFilter(allModels, { minKnowledge: "2025-01" });
      for (const m of result) {
        expect(m.knowledge).toBeDefined();
        expect(m.knowledge! >= "2025-01").toBe(true);
      }
    });

    it("models without knowledge fail minKnowledge filter", () => {
      const noKnowledge = createModel({ id: "no-k" });
      const result = applyFilter([noKnowledge], { minKnowledge: "2024-01" });
      expect(result).toHaveLength(0);
    });
  });

  describe("AND combination", () => {
    it("combines multiple filters with AND logic", () => {
      const result = applyFilter(allModels, {
        reasoning: true,
        toolCall: true,
        maxCostInput: 10,
        providers: ["anthropic", "openai"],
      });
      for (const m of result) {
        expect(m.reasoning).toBe(true);
        expect(m.toolCall).toBe(true);
        expect(m.cost!.input).toBeLessThanOrEqual(10);
        expect(["anthropic", "openai"]).toContain(m.provider);
      }
    });
  });

  describe("empty filter", () => {
    it("empty object only applies excludeDeprecated default", () => {
      const result = applyFilter(allModels, {});
      // allModels doesn't include deprecated, so all should pass
      expect(result).toHaveLength(allModels.length);
    });
  });
});
