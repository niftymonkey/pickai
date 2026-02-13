import { describe, it, expect } from "vitest";
import {
  costEfficiency,
  contextCapacity,
  recency,
  versionFreshness,
  tierFit,
  scoreModels,
} from "./score";
import { Tier } from "./types";
import { createModel, fixtures, allTextModels } from "./test-utils";

// ============================================
// costEfficiency
// ============================================

describe("costEfficiency", () => {
  it("scores cheaper models higher", () => {
    const models = [fixtures.flash, fixtures.sonnet, fixtures.opus];
    // flash ($0.075) < sonnet ($3) < opus ($15)
    expect(costEfficiency(fixtures.flash, models)).toBeGreaterThan(
      costEfficiency(fixtures.sonnet, models)
    );
    expect(costEfficiency(fixtures.sonnet, models)).toBeGreaterThan(
      costEfficiency(fixtures.opus, models)
    );
  });

  it("returns 1.0 for cheapest model and 0.0 for most expensive", () => {
    const models = [fixtures.flash, fixtures.opus];
    expect(costEfficiency(fixtures.flash, models)).toBeCloseTo(1.0);
    expect(costEfficiency(fixtures.opus, models)).toBeCloseTo(0.0);
  });

  it("returns 0 when all models have same price (no differentiation)", () => {
    const same = [
      createModel({ id: "a", pricing: { input: 3, output: 15 } }),
      createModel({ id: "b", pricing: { input: 3, output: 15 } }),
    ];
    expect(costEfficiency(same[0], same)).toBe(0);
    expect(costEfficiency(same[1], same)).toBe(0);
  });

  it("handles single model (returns 0)", () => {
    const models = [fixtures.sonnet];
    expect(costEfficiency(fixtures.sonnet, models)).toBe(0);
  });

  it("treats missing pricing as free ($0)", () => {
    const free = createModel({ id: "free-model", pricing: undefined });
    const paid = createModel({
      id: "paid-model",
      pricing: { input: 5, output: 25 },
    });
    const models = [free, paid];
    expect(costEfficiency(free, models)).toBeCloseTo(1.0);
    expect(costEfficiency(paid, models)).toBeCloseTo(0.0);
  });

  it("produces correct mid-range normalized value", () => {
    const cheap = createModel({ id: "cheap", pricing: { input: 0, output: 0 } });
    const mid = createModel({ id: "mid", pricing: { input: 5, output: 25 } });
    const expensive = createModel({ id: "expensive", pricing: { input: 10, output: 50 } });
    const models = [cheap, mid, expensive];
    // mid is at 5/10 = 0.5 of range, inverted = 0.5
    expect(costEfficiency(mid, models)).toBeCloseTo(0.5);
  });
});

// ============================================
// contextCapacity
// ============================================

describe("contextCapacity", () => {
  it("scores larger context models higher", () => {
    const models = [fixtures.gpt4o, fixtures.sonnet, fixtures.geminiPro];
    // gpt4o (128K) < sonnet (200K) < geminiPro (1M)
    expect(contextCapacity(fixtures.geminiPro, models)).toBeGreaterThan(
      contextCapacity(fixtures.sonnet, models)
    );
    expect(contextCapacity(fixtures.sonnet, models)).toBeGreaterThan(
      contextCapacity(fixtures.gpt4o, models)
    );
  });

  it("returns 1.0 for largest and 0.0 for smallest", () => {
    const models = [fixtures.gpt4o, fixtures.geminiPro];
    expect(contextCapacity(fixtures.geminiPro, models)).toBeCloseTo(1.0);
    expect(contextCapacity(fixtures.gpt4o, models)).toBeCloseTo(0.0);
  });

  it("returns 0 when all models have same context window", () => {
    const same = [
      createModel({ id: "a", contextWindow: 128000 }),
      createModel({ id: "b", contextWindow: 128000 }),
    ];
    expect(contextCapacity(same[0], same)).toBe(0);
  });

  it("treats missing contextWindow as 0", () => {
    const noCtx = createModel({ id: "no-ctx", contextWindow: undefined });
    const hasCtx = createModel({ id: "has-ctx", contextWindow: 128000 });
    const models = [noCtx, hasCtx];
    expect(contextCapacity(noCtx, models)).toBeCloseTo(0.0);
    expect(contextCapacity(hasCtx, models)).toBeCloseTo(1.0);
  });

  it("handles single model (returns 0)", () => {
    const models = [fixtures.sonnet];
    expect(contextCapacity(fixtures.sonnet, models)).toBe(0);
  });

  it("produces correct mid-range normalized value", () => {
    const small = createModel({ id: "small", contextWindow: 0 });
    const mid = createModel({ id: "mid", contextWindow: 50000 });
    const large = createModel({ id: "large", contextWindow: 100000 });
    const models = [small, mid, large];
    expect(contextCapacity(mid, models)).toBeCloseTo(0.5);
  });
});

// ============================================
// recency
// ============================================

describe("recency", () => {
  it("scores newer models higher", () => {
    const models = [fixtures.gpt4o, fixtures.sonnet, fixtures.gpt52];
    // gpt4o (2024-11-20) < sonnet (2025-09-29) < gpt52 (2026-01-15)
    expect(recency(fixtures.gpt52, models)).toBeGreaterThan(
      recency(fixtures.sonnet, models)
    );
    expect(recency(fixtures.sonnet, models)).toBeGreaterThan(
      recency(fixtures.gpt4o, models)
    );
  });

  it("returns 1.0 for newest and 0.0 for oldest", () => {
    const models = [fixtures.gpt4o, fixtures.gpt52];
    expect(recency(fixtures.gpt52, models)).toBeCloseTo(1.0);
    expect(recency(fixtures.gpt4o, models)).toBeCloseTo(0.0);
  });

  it("returns 0 when all models have same date", () => {
    const same = [
      createModel({ id: "a", created: "2025-01-01" }),
      createModel({ id: "b", created: "2025-01-01" }),
    ];
    expect(recency(same[0], same)).toBe(0);
  });

  it("treats missing created date as epoch (oldest)", () => {
    const noDate = createModel({ id: "no-date", created: undefined });
    const hasDate = createModel({ id: "has-date", created: "2025-06-01" });
    const models = [noDate, hasDate];
    expect(recency(noDate, models)).toBeCloseTo(0.0);
    expect(recency(hasDate, models)).toBeCloseTo(1.0);
  });

  it("handles single model (returns 0)", () => {
    const models = [fixtures.sonnet];
    expect(recency(fixtures.sonnet, models)).toBe(0);
  });
});

// ============================================
// versionFreshness
// ============================================

describe("versionFreshness", () => {
  it("scores higher version models higher", () => {
    const models = [fixtures.geminiPro, fixtures.sonnet, fixtures.gpt52];
    // geminiPro ("gemini-2-5-pro" → 200) < sonnet ("claude-sonnet-4-5" → 400) < gpt52 ("gpt-5-2" → 500)
    expect(versionFreshness(fixtures.gpt52, models)).toBeGreaterThan(
      versionFreshness(fixtures.sonnet, models)
    );
    expect(versionFreshness(fixtures.sonnet, models)).toBeGreaterThan(
      versionFreshness(fixtures.geminiPro, models)
    );
  });

  it("returns 1.0 for highest version and 0.0 for lowest", () => {
    const models = [fixtures.geminiPro, fixtures.gpt52];
    // geminiPro → 200, gpt52 → 500
    expect(versionFreshness(fixtures.gpt52, models)).toBeCloseTo(1.0);
    expect(versionFreshness(fixtures.geminiPro, models)).toBeCloseTo(0.0);
  });

  it("returns 0 when all models have no version", () => {
    const same = [
      createModel({ id: "model-a" }),
      createModel({ id: "model-b" }),
    ];
    expect(versionFreshness(same[0], same)).toBe(0);
  });

  it("handles single model (returns 0)", () => {
    const models = [fixtures.sonnet];
    expect(versionFreshness(fixtures.sonnet, models)).toBe(0);
  });

  it("handles mix of versioned and unversioned models", () => {
    const unversioned = createModel({ id: "deepseek-chat" });
    const versioned = createModel({ id: "gpt-5-2" });
    const models = [unversioned, versioned];
    // unversioned → 0, versioned → 500
    expect(versionFreshness(versioned, models)).toBeCloseTo(1.0);
    expect(versionFreshness(unversioned, models)).toBeCloseTo(0.0);
  });
});

// ============================================
// tierFit
// ============================================

describe("tierFit", () => {
  it("returns 1.0 for exact tier match", () => {
    const criterion = tierFit(Tier.Standard);
    expect(criterion(fixtures.sonnet, allTextModels)).toBeCloseTo(1.0);
  });

  it("returns 0.5 for adjacent tier", () => {
    const criterion = tierFit(Tier.Standard);
    // efficient is adjacent to standard
    expect(criterion(fixtures.haiku, allTextModels)).toBeCloseTo(0.5);
    // flagship is adjacent to standard
    expect(criterion(fixtures.opus, allTextModels)).toBeCloseTo(0.5);
  });

  it("returns 0.1 for distant tier", () => {
    const criterion = tierFit(Tier.Efficient);
    // flagship is 2 steps from efficient
    expect(criterion(fixtures.opus, allTextModels)).toBeCloseTo(0.1);
  });

  it("flagship target: flagship=1.0, standard=0.5, efficient=0.1", () => {
    const criterion = tierFit(Tier.Flagship);
    expect(criterion(fixtures.opus, allTextModels)).toBeCloseTo(1.0);
    expect(criterion(fixtures.sonnet, allTextModels)).toBeCloseTo(0.5);
    expect(criterion(fixtures.haiku, allTextModels)).toBeCloseTo(0.1);
  });
});

// ============================================
// scoreModels
// ============================================

describe("scoreModels", () => {
  it("returns ScoredModel[] sorted by score descending", () => {
    const models = [fixtures.haiku, fixtures.sonnet, fixtures.opus];
    const result = scoreModels(models, [
      { criterion: costEfficiency, weight: 1 },
    ]);
    expect(result).toHaveLength(3);
    // Cheapest first when scoring by cost efficiency
    expect(result[0].id).toBe(fixtures.haiku.id);
    expect(result[result.length - 1].id).toBe(fixtures.opus.id);
  });

  it("normalizes weights to sum to 1", () => {
    const models = [fixtures.haiku, fixtures.sonnet];
    // Weights 2 and 8 should behave the same as 0.2 and 0.8
    const result1 = scoreModels(models, [
      { criterion: costEfficiency, weight: 2 },
      { criterion: contextCapacity, weight: 8 },
    ]);
    const result2 = scoreModels(models, [
      { criterion: costEfficiency, weight: 0.2 },
      { criterion: contextCapacity, weight: 0.8 },
    ]);
    expect(result1[0].score).toBeCloseTo(result2[0].score);
    expect(result1[1].score).toBeCloseTo(result2[1].score);
  });

  it("returns scores in the 0-1 range", () => {
    const result = scoreModels(allTextModels, [
      { criterion: costEfficiency, weight: 0.5 },
      { criterion: tierFit(Tier.Standard), weight: 0.5 },
    ]);
    for (const m of result) {
      expect(m.score).toBeGreaterThanOrEqual(0);
      expect(m.score).toBeLessThanOrEqual(1);
    }
  });

  it("returns empty array for empty input", () => {
    expect(scoreModels([], [{ criterion: costEfficiency, weight: 1 }])).toEqual(
      []
    );
  });

  it("handles all-zero weights gracefully (all scores 0)", () => {
    const models = [fixtures.haiku, fixtures.sonnet];
    const result = scoreModels(models, [
      { criterion: costEfficiency, weight: 0 },
      { criterion: contextCapacity, weight: 0 },
    ]);
    expect(result[0].score).toBe(0);
    expect(result[1].score).toBe(0);
  });

  it("preserves all Model properties in ScoredModel", () => {
    const result = scoreModels([fixtures.sonnet], [
      { criterion: costEfficiency, weight: 1 },
    ]);
    expect(result[0].provider).toBe("anthropic");
    expect(result[0].contextWindow).toBe(200000);
    expect(result[0]).toHaveProperty("score");
  });

  it("with single criterion, scores match that criterion directly", () => {
    const models = [fixtures.flash, fixtures.opus];
    const result = scoreModels(models, [
      { criterion: costEfficiency, weight: 1 },
    ]);
    // flash is cheapest → score should be costEfficiency value
    expect(result[0].id).toBe(fixtures.flash.id);
    expect(result[0].score).toBeCloseTo(costEfficiency(fixtures.flash, models));
    expect(result[1].score).toBeCloseTo(costEfficiency(fixtures.opus, models));
  });

  it("dominant weight controls ranking", () => {
    const models = [fixtures.haiku, fixtures.opus];
    // haiku wins cost, opus wins context (200K vs 200K — same, but tierFit differs)
    // With 95% weight on tierFit(Flagship), opus should win
    const flagshipHeavy = scoreModels(models, [
      { criterion: costEfficiency, weight: 0.05 },
      { criterion: tierFit(Tier.Flagship), weight: 0.95 },
    ]);
    expect(flagshipHeavy[0].id).toBe(fixtures.opus.id);

    // With 95% weight on costEfficiency, haiku should win
    const costHeavy = scoreModels(models, [
      { criterion: costEfficiency, weight: 0.95 },
      { criterion: tierFit(Tier.Flagship), weight: 0.05 },
    ]);
    expect(costHeavy[0].id).toBe(fixtures.haiku.id);
  });

  it("handles empty criteria array (all scores 0)", () => {
    const models = [fixtures.haiku, fixtures.sonnet];
    const result = scoreModels(models, []);
    expect(result).toHaveLength(2);
    expect(result[0].score).toBe(0);
    expect(result[1].score).toBe(0);
  });
});
