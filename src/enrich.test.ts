import { describe, it, expect } from "vitest";
import { enrich } from "./enrich";
import { Tier, Cost } from "./types";
import { createModel, fixtures } from "./test-utils";

describe("enrich", () => {
  it("adds tier classification", () => {
    expect(enrich(fixtures.opus).tier).toBe(Tier.Flagship);
    expect(enrich(fixtures.sonnet).tier).toBe(Tier.Standard);
    expect(enrich(fixtures.haiku).tier).toBe(Tier.Efficient);
  });

  it("adds cost tier classification", () => {
    expect(enrich(fixtures.opus).costTier).toBe(Cost.Premium);
    expect(enrich(fixtures.sonnet).costTier).toBe(Cost.Standard);
    expect(enrich(fixtures.gpt4oMini).costTier).toBe(Cost.Budget);
  });

  it("adds formatted provider name", () => {
    expect(enrich(fixtures.opus).providerName).toBe("Anthropic");
    expect(enrich(fixtures.gpt4o).providerName).toBe("OpenAI");
    expect(enrich(fixtures.flash).providerName).toBe("Google");
  });

  it("adds formatted price label", () => {
    expect(enrich(fixtures.sonnet).priceLabel).toBe("$3/$15 per 1M");
  });

  it("sets priceLabel to Free for zero pricing", () => {
    const free = createModel({ pricing: { input: 0, output: 0 } });
    expect(enrich(free).priceLabel).toBe("Free");
  });

  it("sets priceLabel to empty string when pricing is undefined", () => {
    const noPricing = createModel({ pricing: undefined });
    expect(enrich(noPricing).priceLabel).toBe("");
  });

  it("adds formatted context label", () => {
    expect(enrich(fixtures.gpt4o).contextLabel).toBe("128K");
    expect(enrich(fixtures.flash).contextLabel).toBe("1.0M");
  });

  it("sets contextLabel to empty string when contextWindow is undefined", () => {
    const noCtx = createModel({ contextWindow: undefined });
    expect(enrich(noCtx).contextLabel).toBe("");
  });

  it("preserves all original Model fields", () => {
    const result = enrich(fixtures.sonnet);
    expect(result.id).toBe(fixtures.sonnet.id);
    expect(result.apiId).toBe(fixtures.sonnet.apiId);
    expect(result.openRouterId).toBe(fixtures.sonnet.openRouterId);
    expect(result.name).toBe(fixtures.sonnet.name);
    expect(result.provider).toBe(fixtures.sonnet.provider);
    expect(result.pricing).toEqual(fixtures.sonnet.pricing);
    expect(result.contextWindow).toBe(fixtures.sonnet.contextWindow);
    expect(result.capabilities).toEqual(fixtures.sonnet.capabilities);
  });

  it("composes with .map() for batch enrichment", () => {
    const enriched = [fixtures.haiku, fixtures.sonnet, fixtures.opus].map(enrich);
    expect(enriched.map((m) => m.tier)).toEqual([
      Tier.Efficient,
      Tier.Standard,
      Tier.Flagship,
    ]);
  });

  it("chains with .filter() on enriched fields", () => {
    const flagships = [fixtures.haiku, fixtures.sonnet, fixtures.opus]
      .map(enrich)
      .filter((m) => m.tier === Tier.Flagship);
    expect(flagships).toHaveLength(1);
    expect(flagships[0].id).toBe(fixtures.opus.id);
  });
});
