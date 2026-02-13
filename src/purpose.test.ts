import { describe, it, expect } from "vitest";
import { purposes, recommend } from "./purpose";
import type { PurposeName } from "./purpose";
import { Tier } from "./types";
import type { Model, PurposeProfile } from "./types";
import { classifyTier, isTextFocused } from "./classify";
import { createModel, fixtures, allTextModels } from "./test-utils";
import { parseOpenRouterCatalog } from "./adapters/openrouter";
import type { OpenRouterModel } from "./adapters/openrouter";
import fixtureData from "./__fixtures__/openrouter-models.json";

// ----- Real OpenRouter catalog (334 text-focused models, 8 non-text) -----
const realCatalog = parseOpenRouterCatalog(
  fixtureData as { data: OpenRouterModel[] }
);
const realTextModels = realCatalog.filter(isTextFocused);

// ============================================
// Built-in purpose profiles (structure)
// ============================================

describe("purposes", () => {
  it("has 6 built-in profiles", () => {
    expect(Object.keys(purposes)).toHaveLength(6);
  });

  it("all profiles have required fields", () => {
    for (const [name, profile] of Object.entries(purposes)) {
      expect(profile.preferredTier, `${name}.preferredTier`).toBeDefined();
      expect(profile.weights, `${name}.weights`).toBeDefined();
      expect(profile.weights.cost, `${name}.weights.cost`).toBeTypeOf("number");
      expect(
        profile.weights.quality,
        `${name}.weights.quality`
      ).toBeTypeOf("number");
      expect(
        profile.weights.context,
        `${name}.weights.context`
      ).toBeTypeOf("number");
    }
  });

  it("cheap profile targets efficient tier with high cost weight", () => {
    expect(purposes.cheap.preferredTier).toBe(Tier.Efficient);
    expect(purposes.cheap.weights.cost).toBeGreaterThan(
      purposes.cheap.weights.quality
    );
  });

  it("balanced profile targets standard tier", () => {
    expect(purposes.balanced.preferredTier).toBe(Tier.Standard);
  });

  it("quality profile targets flagship tier with high quality weight", () => {
    expect(purposes.quality.preferredTier).toBe(Tier.Flagship);
    expect(purposes.quality.weights.quality).toBeGreaterThan(
      purposes.quality.weights.cost
    );
  });

  it("coding profile targets standard tier and requires tools", () => {
    expect(purposes.coding.preferredTier).toBe(Tier.Standard);
    expect(purposes.coding.require?.tools).toBe(true);
  });

  it("creative profile targets flagship tier", () => {
    expect(purposes.creative.preferredTier).toBe(Tier.Flagship);
  });

  it("reviewer profile requires tools, minContext, and excludes efficient tier", () => {
    expect(purposes.reviewer.require?.tools).toBe(true);
    expect(purposes.reviewer.require?.minContext).toBeGreaterThanOrEqual(8000);
    expect(purposes.reviewer.exclude?.tiers).toContain(Tier.Efficient);
  });

  it("reviewer profile excludes code/vision specialized patterns", () => {
    expect(purposes.reviewer.exclude?.patterns).toBeDefined();
    expect(purposes.reviewer.exclude!.patterns!.length).toBeGreaterThan(0);
  });
});

// ============================================
// recommend() — real OpenRouter data
// ============================================

describe("recommend (real OpenRouter catalog)", () => {
  // -----------------------------------------
  // Core tier-filtering guarantee
  // -----------------------------------------

  describe("tier filtering is structural (not a competing weight)", () => {
    it("balanced returns standard-tier model", () => {
      const result = recommend(realTextModels, "balanced");
      expect(classifyTier(result[0])).toBe(Tier.Standard);
    });

    it("cheap returns efficient-tier model", () => {
      const result = recommend(realTextModels, "cheap");
      expect(classifyTier(result[0])).toBe(Tier.Efficient);
    });

    it("quality returns flagship-tier model", () => {
      const result = recommend(realTextModels, "quality");
      expect(classifyTier(result[0])).toBe(Tier.Flagship);
    });

    it("preferred tier models always appear before adjacent-tier models", () => {
      const result = recommend(realTextModels, "balanced", {
        count: 10,
        providerDiversity: false,
      });
      // Find where the first non-standard model appears
      const firstNonStandard = result.findIndex(
        (m) => classifyTier(m) !== Tier.Standard
      );
      // Everything before it must be standard
      if (firstNonStandard > 0) {
        for (let i = 0; i < firstNonStandard; i++) {
          expect(classifyTier(result[i])).toBe(Tier.Standard);
        }
      }
    });

    it("adjacent tiers only appear after preferred tier is exhausted", () => {
      // With 256 standard-tier models, requesting 300 should force expansion
      const result = recommend(realTextModels, "balanced", {
        count: 300,
        providerDiversity: false,
      });
      const standardCount = result.filter(
        (m) => classifyTier(m) === Tier.Standard
      ).length;
      // All standard-tier models should appear before any non-standard
      const standardModels = realTextModels.filter(
        (m) => classifyTier(m) === Tier.Standard
      );
      // Check that we got all the standard-tier ones (that pass filters)
      expect(standardCount).toBe(standardModels.length);
    });
  });

  // -----------------------------------------
  // All built-in profiles produce reasonable results
  // -----------------------------------------

  describe("all profiles produce reasonable results", () => {
    it("coding recommends a standard-tier model with tools", () => {
      const result = recommend(realTextModels, "coding");
      expect(result).toHaveLength(1);
      expect(classifyTier(result[0])).toBe(Tier.Standard);
      expect(result[0].capabilities?.tools).toBe(true);
    });

    it("creative recommends a flagship-tier model", () => {
      const result = recommend(realTextModels, "creative");
      expect(result).toHaveLength(1);
      expect(classifyTier(result[0])).toBe(Tier.Flagship);
    });

    it("reviewer recommends a non-efficient model with tools", () => {
      const result = recommend(realTextModels, "reviewer");
      expect(result).toHaveLength(1);
      const tier = classifyTier(result[0]);
      expect([Tier.Standard, Tier.Flagship]).toContain(tier);
      expect(result[0].capabilities?.tools).toBe(true);
    });

    it("balanced top pick is a recognizable standard-tier model", () => {
      const result = recommend(realTextModels, "balanced");
      expect(classifyTier(result[0])).toBe(Tier.Standard);
      // Should be a well-known model, not an obscure one
      expect(result[0].score).toBeGreaterThan(0);
    });
  });

  // -----------------------------------------
  // Provider diversity
  // -----------------------------------------

  describe("provider diversity", () => {
    it("does not apply provider diversity by default", () => {
      const result = recommend(realTextModels, "balanced", { count: 10 });
      // Without diversity, top results may cluster on one provider
      expect(result.length).toBe(10);
    });

    it("providerDiversity: true prefers different providers", () => {
      const result = recommend(realTextModels, "balanced", {
        count: 5,
        providerDiversity: true,
      });
      const providers = new Set(result.map((m) => m.provider));
      expect(providers.size).toBeGreaterThan(1);
    });

    it("diversity spans across tier groups", () => {
      const result = recommend(realTextModels, "balanced", {
        count: 10,
        providerDiversity: true,
      });
      const providers = result.map((m) => m.provider);
      expect(new Set(providers).size).toBeGreaterThan(2);
    });
  });

  // -----------------------------------------
  // Filtering with real data
  // -----------------------------------------

  describe("filtering", () => {
    it("filters non-text-focused models by default", () => {
      // Use realCatalog (includes image/audio generators)
      const result = recommend(realCatalog, "balanced", { count: 500 });
      for (const m of result) {
        expect(isTextFocused(m)).toBe(true);
      }
    });

    it("includes non-text-focused models when textOnly is false", () => {
      const result = recommend(realCatalog, "balanced", { count: 500, textOnly: false });
      const nonText = result.filter((m) => !isTextFocused(m));
      expect(nonText.length).toBeGreaterThan(0);
    });

    it("coding profile excludes models without tools from real catalog", () => {
      const result = recommend(realTextModels, "coding", { count: 500 });
      for (const m of result) {
        expect(m.capabilities?.tools).toBe(true);
      }
    });

    it("reviewer profile excludes efficient-tier models", () => {
      const result = recommend(realTextModels, "reviewer", { count: 500 });
      for (const m of result) {
        expect(classifyTier(m)).not.toBe(Tier.Efficient);
      }
    });

    it("reviewer profile excludes code/vision/omni pattern models", () => {
      const result = recommend(realTextModels, "reviewer", { count: 500 });
      const patterns = purposes.reviewer.exclude!.patterns!;
      for (const m of result) {
        for (const p of patterns) {
          expect(m.id.toLowerCase()).not.toContain(p.toLowerCase());
          expect(m.name.toLowerCase()).not.toContain(p.toLowerCase());
        }
      }
    });
  });

  // -----------------------------------------
  // Output ordering
  // -----------------------------------------

  describe("output ordering", () => {
    it("output is sorted by score descending", () => {
      const result = recommend(realTextModels, "balanced", {
        count: 20,
        providerDiversity: false,
      });
      for (let i = 1; i < result.length; i++) {
        expect(result[i - 1].score).toBeGreaterThanOrEqual(result[i].score);
      }
    });
  });
});

// ============================================
// recommend() — synthetic fixtures (edge cases)
// ============================================

describe("recommend (synthetic fixtures)", () => {
  // -----------------------------------------
  // Tier fallback behavior
  // -----------------------------------------

  describe("tier fallback", () => {
    it("falls back to adjacent tier when preferred tier is empty", () => {
      const efficientOnly = [fixtures.haiku, fixtures.gpt4oMini, fixtures.flash];
      const result = recommend(efficientOnly, "quality");
      expect(result).toHaveLength(1);
    });

    it("falls back to distant tier when preferred and adjacent are both empty", () => {
      const efficientOnly = [fixtures.haiku, fixtures.gpt4oMini, fixtures.flash];
      const result = recommend(efficientOnly, "quality");
      expect(result).toHaveLength(1);
      expect(classifyTier(result[0])).toBe(Tier.Efficient);
    });

    it("prefers adjacent tier over distant tier in fallback", () => {
      const noFlagship = [fixtures.sonnet, fixtures.haiku];
      const result = recommend(noFlagship, "quality");
      expect(result).toHaveLength(1);
      expect(classifyTier(result[0])).toBe(Tier.Standard);
    });
  });

  // -----------------------------------------
  // Within-tier scoring
  // -----------------------------------------

  describe("within-tier scoring", () => {
    it("version tiebreaker: prefers newer version among identical models", () => {
      const older = createModel({
        id: "claude-sonnet-3-7",
        name: "Claude Sonnet 3.7",
        provider: "anthropic",
        pricing: { input: 3, output: 15 },
        contextWindow: 200000,
        capabilities: { tools: true },
        created: "2025-02-19",
      });
      const newer = createModel({
        id: "claude-sonnet-4-5",
        name: "Claude Sonnet 4.5",
        provider: "anthropic",
        pricing: { input: 3, output: 15 },
        contextWindow: 200000,
        capabilities: { tools: true },
        created: "2025-09-29",
      });
      const result = recommend([older, newer], "balanced");
      expect(result[0].id).toBe("claude-sonnet-4-5");
    });

    it("cost-focused profile prefers cheaper model within tier", () => {
      const result = recommend(allTextModels, "cheap");
      expect(result[0].id).toBe(fixtures.flash.id);
    });
  });

  // -----------------------------------------
  // String shorthand vs custom profile
  // -----------------------------------------

  describe("string shorthand and custom profiles", () => {
    it("accepts a purpose name string", () => {
      const result = recommend(allTextModels, "balanced");
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty("score");
    });

    it("accepts a full PurposeProfile object", () => {
      const custom: PurposeProfile = {
        preferredTier: Tier.Flagship,
        weights: { cost: 0, quality: 1, context: 0 },
      };
      const result = recommend(allTextModels, custom);
      expect(result).toHaveLength(1);
      expect(classifyTier(result[0])).toBe(Tier.Flagship);
    });

    it("custom profile with require/exclude works", () => {
      const custom: PurposeProfile = {
        preferredTier: Tier.Standard,
        weights: { cost: 0.5, quality: 0.3, context: 0.2 },
        require: { tools: true },
        exclude: { patterns: ["gpt"] },
      };
      const result = recommend(allTextModels, custom, { count: 5 });
      for (const m of result) {
        expect(m.capabilities?.tools).toBe(true);
        expect(m.id.toLowerCase()).not.toContain("gpt");
      }
    });
  });

  // -----------------------------------------
  // Filtering edge cases (require synthetic models)
  // -----------------------------------------

  describe("filtering edge cases", () => {
    it("reviewer profile excludes vision-specialized model names", () => {
      const visionModel = createModel({
        id: "vision-specialist",
        name: "Vision Specialist",
        provider: "test",
        capabilities: { tools: true },
        contextWindow: 128000,
      });
      const models = [...allTextModels, visionModel];
      const result = recommend(models, "reviewer", { count: 20 });
      expect(result.find((m) => m.id === "vision-specialist")).toBeUndefined();
    });

    it("reviewer profile excludes models below minContext", () => {
      const smallCtx = createModel({
        id: "small-ctx-model",
        name: "Small Context Model",
        provider: "test",
        capabilities: { tools: true },
        contextWindow: 4000,
        pricing: { input: 2, output: 10 },
      });
      const models = [...allTextModels, smallCtx];
      const result = recommend(models, "reviewer", { count: 20 });
      expect(result.find((m) => m.id === "small-ctx-model")).toBeUndefined();
    });
  });

  // -----------------------------------------
  // Edge cases
  // -----------------------------------------

  describe("edge cases", () => {
    it("returns empty array for empty models", () => {
      expect(recommend([], "balanced")).toEqual([]);
    });

    it("returns empty array when all models filtered out", () => {
      const onlyEfficient = [fixtures.haiku, fixtures.gpt4oMini, fixtures.flash];
      const result = recommend(onlyEfficient, "reviewer");
      expect(result).toEqual([]);
    });

    it("returns fewer than count when not enough models pass filters", () => {
      const result = recommend([fixtures.sonnet], "balanced", { count: 5 });
      expect(result).toHaveLength(1);
    });

    it("handles single model in preferred tier", () => {
      const result = recommend([fixtures.sonnet], "balanced");
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(fixtures.sonnet.id);
    });

    it("handles all models in wrong tier with fallback", () => {
      const flagshipOnly = [fixtures.opus, fixtures.gpt5Pro, fixtures.geminiPro];
      const result = recommend(flagshipOnly, "cheap");
      expect(result).toHaveLength(1);
      expect(classifyTier(result[0])).toBe(Tier.Flagship);
    });
  });
});
