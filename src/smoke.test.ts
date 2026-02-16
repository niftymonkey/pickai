import { describe, it, expect } from "vitest";

describe("smoke: main entry (pickai)", () => {
  it("exports recommend as a function", async () => {
    const mod = await import("./index");
    expect(typeof mod.recommend).toBe("function");
  });

  it("exports enrich as a function", async () => {
    const mod = await import("./index");
    expect(typeof mod.enrich).toBe("function");
  });

  it("exports groupByProvider as a function", async () => {
    const mod = await import("./index");
    expect(typeof mod.groupByProvider).toBe("function");
  });

  it("exports scoreModels as a function", async () => {
    const mod = await import("./index");
    expect(typeof mod.scoreModels).toBe("function");
  });

  it("exports selectModels as a function", async () => {
    const mod = await import("./index");
    expect(typeof mod.selectModels).toBe("function");
  });

  it("exports Purpose constant namespace", async () => {
    const mod = await import("./index");
    expect(mod.Purpose.Balanced).toBe("balanced");
    expect(mod.Purpose.Cheap).toBe("cheap");
    expect(mod.Purpose.Quality).toBe("quality");
    expect(mod.Purpose.Coding).toBe("coding");
    expect(mod.Purpose.Creative).toBe("creative");
    expect(mod.Purpose.Reviewer).toBe("reviewer");
  });

  it("exports Tier constant namespace", async () => {
    const mod = await import("./index");
    expect(mod.Tier.Efficient).toBeTruthy();
    expect(mod.Tier.Standard).toBeTruthy();
    expect(mod.Tier.Flagship).toBeTruthy();
  });

  it("exports Cost constant namespace", async () => {
    const mod = await import("./index");
    expect(mod.Cost.Free).toBeTruthy();
    expect(mod.Cost.Budget).toBeTruthy();
    expect(mod.Cost.Standard).toBeTruthy();
    expect(mod.Cost.Premium).toBeTruthy();
    expect(mod.Cost.Ultra).toBeTruthy();
  });

  it("exports ID utilities", async () => {
    const mod = await import("./index");
    expect(typeof mod.normalizeModelId).toBe("function");
    expect(typeof mod.parseModelId).toBe("function");
    expect(typeof mod.resolveProvider).toBe("function");
    expect(typeof mod.extractDirectModelId).toBe("function");
    expect(typeof mod.toOpenRouterFormat).toBe("function");
    expect(typeof mod.toDirectFormat).toBe("function");
    expect(typeof mod.matchesModel).toBe("function");
    expect(typeof mod.extractVersion).toBe("function");
  });

  it("exports classification functions", async () => {
    const mod = await import("./index");
    expect(typeof mod.classifyTier).toBe("function");
    expect(typeof mod.classifyCostTier).toBe("function");
    expect(typeof mod.maxTier).toBe("function");
    expect(typeof mod.minTier).toBe("function");
    expect(typeof mod.maxCost).toBe("function");
    expect(typeof mod.minCost).toBe("function");
    expect(typeof mod.supportsTools).toBe("function");
    expect(typeof mod.supportsVision).toBe("function");
    expect(typeof mod.isTextFocused).toBe("function");
  });

  it("exports format functions", async () => {
    const mod = await import("./index");
    expect(typeof mod.formatPrice).toBe("function");
    expect(typeof mod.formatPricing).toBe("function");
    expect(typeof mod.formatContextWindow).toBe("function");
    expect(typeof mod.formatProviderName).toBe("function");
  });

  it("exports scoring criteria", async () => {
    const mod = await import("./index");
    expect(typeof mod.costEfficiency).toBe("function");
    expect(typeof mod.contextCapacity).toBe("function");
    expect(typeof mod.recency).toBe("function");
    expect(typeof mod.versionFreshness).toBe("function");
    expect(typeof mod.tierFit).toBe("function");
  });

  it("exports selection utilities", async () => {
    const mod = await import("./index");
    expect(typeof mod.providerDiversity).toBe("function");
    expect(typeof mod.minContextWindow).toBe("function");
  });

  it("exports adapter functions from main entry", async () => {
    const mod = await import("./index");
    expect(typeof mod.parseOpenRouterModel).toBe("function");
    expect(typeof mod.parseOpenRouterCatalog).toBe("function");
  });
});

describe("smoke: adapters subpath (pickai/adapters)", () => {
  it("exports parseOpenRouterModel", async () => {
    const mod = await import("./adapters/index");
    expect(typeof mod.parseOpenRouterModel).toBe("function");
  });

  it("exports parseOpenRouterCatalog", async () => {
    const mod = await import("./adapters/index");
    expect(typeof mod.parseOpenRouterCatalog).toBe("function");
  });
});
