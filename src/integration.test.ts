import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  parseOpenRouterCatalog,
  enrich,
  recommend,
  Purpose,
  Tier,
  Cost,
  groupByProvider,
  scoreModels,
  selectModels,
  costEfficiency,
  contextCapacity,
  recency,
  classifyTier,
  classifyCostTier,
  maxCost,
  supportsTools,
} from "./index";

const fixture = JSON.parse(
  readFileSync(join(__dirname, "__fixtures__/openrouter-models.json"), "utf-8")
);

const models = parseOpenRouterCatalog(fixture);
const enriched = models.map(enrich);

describe("integration: full pipeline", () => {
  it("parses the fixture into a non-trivial set of models", () => {
    expect(models.length).toBeGreaterThan(50);
    for (const m of models) {
      expect(m.id).toBeTruthy();
      expect(m.provider).toBeTruthy();
      expect(m.openRouterId).toContain("/");
    }
  });

  it("enriches every model with classification fields", () => {
    for (const m of enriched) {
      expect(m.tier).toBeTruthy();
      expect(m.costTier).toBeTruthy();
      expect(m.providerName).toBeTruthy();
      expect(typeof m.priceLabel).toBe("string");
      expect(typeof m.contextLabel).toBe("string");
    }
  });

  describe("recommend()", () => {
    it("Purpose.Balanced returns Standard-tier models", () => {
      const result = recommend(enriched, Purpose.Balanced);
      expect(result.length).toBe(1);
      expect(classifyTier(result[0])).toBe(Tier.Standard);
      expect(result[0].score).toBeGreaterThanOrEqual(0);
      expect(result[0].score).toBeLessThanOrEqual(1);
    });

    it("Purpose.Cheap with count=3 returns 3 Efficient-tier models", () => {
      const result = recommend(enriched, Purpose.Cheap, { count: 3 });
      expect(result).toHaveLength(3);
      for (const m of result) {
        expect(classifyTier(m)).toBe(Tier.Efficient);
      }
    });

    it("Purpose.Coding returns models with tool support", () => {
      const result = recommend(enriched, Purpose.Coding, { count: 5 });
      expect(result.length).toBeGreaterThan(0);
      for (const m of result) {
        expect(supportsTools(m)).toBe(true);
      }
    });

    it("Purpose.Quality returns Flagship-tier models", () => {
      const result = recommend(enriched, Purpose.Quality, { count: 3 });
      expect(result.length).toBeGreaterThan(0);
      for (const m of result) {
        expect(classifyTier(m)).toBe(Tier.Flagship);
      }
    });

    it("returns scored models with scores in 0-1 range", () => {
      const result = recommend(enriched, Purpose.Balanced, { count: 10 });
      for (const m of result) {
        expect(m.score).toBeGreaterThanOrEqual(0);
        expect(m.score).toBeLessThanOrEqual(1);
      }
    });

    it("preserves enriched fields on scored results", () => {
      const result = recommend(enriched, Purpose.Balanced);
      const top = result[0];
      expect(top.tier).toBeTruthy();
      expect(top.costTier).toBeTruthy();
      expect(top.providerName).toBeTruthy();
      expect(typeof top.priceLabel).toBe("string");
      expect(typeof top.contextLabel).toBe("string");
    });
  });

  describe("groupByProvider()", () => {
    it("groups enriched models with non-empty groups", () => {
      const groups = groupByProvider(enriched);
      expect(groups.length).toBeGreaterThan(1);
      for (const g of groups) {
        expect(g.provider).toBeTruthy();
        expect(g.providerName).toBeTruthy();
        expect(g.models.length).toBeGreaterThan(0);
      }
    });

    it("groups are sorted alphabetically by default", () => {
      const groups = groupByProvider(enriched);
      const providers = groups.map((g) => g.provider);
      expect(providers).toEqual([...providers].sort());
    });

    it("preserves enriched fields on grouped models", () => {
      const groups = groupByProvider(enriched);
      const firstModel = groups[0].models[0];
      expect(firstModel.tier).toBeTruthy();
      expect(firstModel.costTier).toBeTruthy();
    });
  });

  describe("score → select pipeline", () => {
    it("scores and selects budget models", () => {
      const budget = enriched.filter(maxCost(Cost.Standard));
      expect(budget.length).toBeGreaterThan(0);

      const scored = scoreModels(budget, [
        { criterion: costEfficiency, weight: 0.5 },
        { criterion: contextCapacity, weight: 0.3 },
        { criterion: recency, weight: 0.2 },
      ]);

      expect(scored.length).toBe(budget.length);
      for (const m of scored) {
        expect(m.score).toBeGreaterThanOrEqual(0);
        expect(m.score).toBeLessThanOrEqual(1);
      }

      // Sorted descending by score
      for (let i = 1; i < scored.length; i++) {
        expect(scored[i - 1].score).toBeGreaterThanOrEqual(scored[i].score);
      }

      const selected = selectModels(scored, { count: 3 });
      expect(selected).toHaveLength(3);
      // Selected should be the top 3 scored
      expect(selected[0].score).toBe(scored[0].score);
    });

    it("filters by tier then scores", () => {
      const standards = enriched.filter((m) => classifyTier(m) === Tier.Standard);
      expect(standards.length).toBeGreaterThan(0);

      const scored = scoreModels(standards, [
        { criterion: costEfficiency, weight: 0.4 },
        { criterion: contextCapacity, weight: 0.6 },
      ]);

      for (const m of scored) {
        expect(classifyTier(m)).toBe(Tier.Standard);
        expect(m.score).toBeGreaterThanOrEqual(0);
        expect(m.score).toBeLessThanOrEqual(1);
      }
    });
  });

  describe("cost tier distribution", () => {
    it("fixture contains models across multiple cost tiers", () => {
      const tiers = new Set(enriched.map((m) => m.costTier));
      // Real-world fixture should have at least 3 distinct cost tiers
      expect(tiers.size).toBeGreaterThanOrEqual(3);
    });

    it("fixture contains models across all capability tiers", () => {
      const tiers = new Set(enriched.map((m) => m.tier));
      expect(tiers.has(Tier.Efficient)).toBe(true);
      expect(tiers.has(Tier.Standard)).toBe(true);
      expect(tiers.has(Tier.Flagship)).toBe(true);
    });
  });
});
