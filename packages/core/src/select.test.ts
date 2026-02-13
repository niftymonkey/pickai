import { describe, it, expect } from "vitest";
import { providerDiversity, minContextWindow, selectModels } from "./select";
import type { ScoredModel } from "./types";
import { fixtures } from "./test-utils";

/** Helper: create a ScoredModel from a fixture with a given score */
function scored(fixture: (typeof fixtures)[keyof typeof fixtures], score: number): ScoredModel {
  return { ...fixture, score };
}

// Pre-scored models (sorted descending by score, as scoreModels would return)
const scoredModels: ScoredModel[] = [
  scored(fixtures.opus, 0.95),         // anthropic, flagship
  scored(fixtures.sonnet, 0.85),       // anthropic, standard
  scored(fixtures.gpt52, 0.80),        // openai, standard
  scored(fixtures.geminiPro, 0.75),    // google, flagship
  scored(fixtures.gpt4o, 0.70),        // openai, standard
  scored(fixtures.haiku, 0.60),        // anthropic, efficient
  scored(fixtures.flash, 0.50),        // google, efficient
  scored(fixtures.gpt4oMini, 0.40),    // openai, efficient
];

// ============================================
// providerDiversity
// ============================================

describe("providerDiversity", () => {
  it("allows first model from any provider", () => {
    const constraint = providerDiversity();
    expect(constraint([], scoredModels[0])).toBe(true);
  });

  it("blocks second model from same provider (default max 1)", () => {
    const constraint = providerDiversity();
    const selected = [scoredModels[0]]; // anthropic
    expect(constraint(selected, scoredModels[1])).toBe(false); // also anthropic
  });

  it("allows model from different provider", () => {
    const constraint = providerDiversity();
    const selected = [scoredModels[0]]; // anthropic
    expect(constraint(selected, scoredModels[2])).toBe(true); // openai
  });

  it("respects custom maxPerProvider", () => {
    const constraint = providerDiversity(2);
    const selected = [scoredModels[0]]; // anthropic
    // Second anthropic model should be allowed
    expect(constraint(selected, scoredModels[1])).toBe(true);
    // Third should be blocked
    const selected2 = [scoredModels[0], scoredModels[1]]; // 2 anthropic
    expect(constraint(selected2, scoredModels[5])).toBe(false); // also anthropic
  });
});

// ============================================
// minContextWindow
// ============================================

describe("minContextWindow", () => {
  it("allows models meeting the minimum", () => {
    const constraint = minContextWindow(200000);
    expect(constraint([], scored(fixtures.sonnet, 0.8))).toBe(true); // 200K
    expect(constraint([], scored(fixtures.geminiPro, 0.7))).toBe(true); // 1M
  });

  it("blocks models below the minimum", () => {
    const constraint = minContextWindow(200000);
    expect(constraint([], scored(fixtures.gpt4o, 0.7))).toBe(false); // 128K
  });

  it("treats missing contextWindow as 0", () => {
    const constraint = minContextWindow(1);
    const noCtx = scored(
      { ...fixtures.gpt4o, contextWindow: undefined },
      0.7
    );
    expect(constraint([], noCtx)).toBe(false);
  });
});

// ============================================
// selectModels
// ============================================

describe("selectModels", () => {
  it("selects top N models by score (default count=1)", () => {
    const result = selectModels(scoredModels);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(fixtures.opus.id);
  });

  it("selects top N models by score with count", () => {
    const result = selectModels(scoredModels, { count: 3 });
    expect(result).toHaveLength(3);
    expect(result[0].score).toBeGreaterThanOrEqual(result[1].score);
    expect(result[1].score).toBeGreaterThanOrEqual(result[2].score);
  });

  it("returns all models if count exceeds available", () => {
    const few = scoredModels.slice(0, 2);
    const result = selectModels(few, { count: 5 });
    expect(result).toHaveLength(2);
  });

  it("first pass picks the highest-scored model from each provider", () => {
    const result = selectModels(scoredModels, {
      count: 3,
      constraints: [providerDiversity()],
    });
    expect(result).toHaveLength(3);
    // Best from each: opus (anthropic, 0.95), gpt52 (openai, 0.80), geminiPro (google, 0.75)
    expect(result.map((m) => m.id)).toEqual([
      fixtures.opus.id,
      fixtures.gpt52.id,
      fixtures.geminiPro.id,
    ]);
  });

  it("second pass fills remaining slots in score order", () => {
    // All anthropic — diversity allows 1 in first pass, fills 2 more in second
    const allAnthropic = [
      scored(fixtures.opus, 0.95),
      scored(fixtures.sonnet, 0.85),
      scored(fixtures.haiku, 0.60),
    ];
    const result = selectModels(allAnthropic, {
      count: 3,
      constraints: [providerDiversity()],
    });
    expect(result).toHaveLength(3);
    // First pass: opus. Second pass: sonnet (0.85), haiku (0.60)
    expect(result.map((m) => m.id)).toEqual([
      fixtures.opus.id,
      fixtures.sonnet.id,
      fixtures.haiku.id,
    ]);
  });

  it("applies filter option before selection", () => {
    const result = selectModels(scoredModels, {
      count: 3,
      filter: (m) => m.provider !== "anthropic",
    });
    expect(result.every((m) => m.provider !== "anthropic")).toBe(true);
  });

  it("returns empty array for empty input", () => {
    expect(selectModels([])).toEqual([]);
  });

  it("returns empty array when all models filtered out", () => {
    const result = selectModels(scoredModels, {
      filter: () => false,
    });
    expect(result).toEqual([]);
  });

  it("combines filter and constraints", () => {
    const result = selectModels(scoredModels, {
      count: 2,
      filter: (m) => (m.contextWindow ?? 0) >= 200000,
      constraints: [providerDiversity()],
    });
    // Only models with 200K+: opus, sonnet, geminiPro (haiku also 200K)
    // With diversity: should pick from different providers
    expect(result).toHaveLength(2);
    expect(result[0].provider).not.toBe(result[1].provider);
  });

  it("preserves score ordering without constraints", () => {
    const result = selectModels(scoredModels, { count: 5 });
    expect(result).toHaveLength(5);
    // Should be exactly the top 5 in order
    expect(result.map((m) => m.id)).toEqual([
      fixtures.opus.id,
      fixtures.sonnet.id,
      fixtures.gpt52.id,
      fixtures.geminiPro.id,
      fixtures.gpt4o.id,
    ]);
  });

  it("applies multiple constraints simultaneously", () => {
    const result = selectModels(scoredModels, {
      count: 3,
      constraints: [providerDiversity(), minContextWindow(200000)],
    });
    // Must satisfy both: diverse providers AND >= 200K context
    // First pass candidates with 200K+: opus (anthropic), geminiPro (google), sonnet (anthropic, blocked by diversity), haiku (anthropic, blocked)
    // gpt52 has 256K and is openai
    // First pass: opus (anthropic, 200K), gpt52 (openai, 256K), geminiPro (google, 1M)
    expect(result).toHaveLength(3);
    for (const m of result) {
      expect(m.contextWindow).toBeGreaterThanOrEqual(200000);
    }
    expect(new Set(result.map((m) => m.provider)).size).toBe(3);
  });

  it("filter narrows before count is applied", () => {
    // Filter to only openai, ask for 5
    const result = selectModels(scoredModels, {
      count: 5,
      filter: (m) => m.provider === "openai",
    });
    // Only 3 openai models in scoredModels: gpt52, gpt4o, gpt4oMini
    expect(result).toHaveLength(3);
    expect(result.every((m) => m.provider === "openai")).toBe(true);
    // Verify score ordering
    expect(result[0].score).toBeGreaterThanOrEqual(result[1].score);
    expect(result[1].score).toBeGreaterThanOrEqual(result[2].score);
  });
});
