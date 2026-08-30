import { describe, it, expect } from "vitest";
import {
  minMaxCriterion,
  costEfficiency,
  contextCapacity,
  recency,
  knowledgeFreshness,
  outputCapacity,
  scoreModels,
  criterionCoverage,
} from "./score";
import { createModel, fixtures, allModels } from "./test-utils";

// ============================================
// minMaxCriterion
// ============================================

describe("minMaxCriterion", () => {
  it("normalizes values across model set", () => {
    const criterion = minMaxCriterion((m) => m.cost?.input);
    const models = [fixtures.flash, fixtures.sonnet, fixtures.opus];
    // flash=0.075, sonnet=3, opus=15
    expect(criterion(fixtures.flash, models)).toBeCloseTo(0.0);
    expect(criterion(fixtures.opus, models)).toBeCloseTo(1.0);
    expect(criterion(fixtures.sonnet, models)).toBeGreaterThan(0);
    expect(criterion(fixtures.sonnet, models)).toBeLessThan(1);
  });

  it("returns undefined when getValue returns undefined (uncovered)", () => {
    const criterion = minMaxCriterion(() => undefined);
    expect(criterion(fixtures.sonnet, allModels)).toBeUndefined();
  });

  it("returns undefined for model without data when others have values", () => {
    const scores = new Map([["claude-sonnet-4-5", 80]]);
    const criterion = minMaxCriterion((m) => scores.get(m.id));
    const models = [fixtures.sonnet, fixtures.opus];
    expect(criterion(fixtures.opus, models)).toBeUndefined();
    expect(criterion(fixtures.sonnet, models)).toBeGreaterThanOrEqual(0);
  });

  it("inverts scores when invert is true", () => {
    const criterion = minMaxCriterion((m) => m.cost?.input, true);
    const models = [fixtures.flash, fixtures.sonnet, fixtures.opus];
    // Inverted: cheapest scores highest
    expect(criterion(fixtures.flash, models)).toBeCloseTo(1.0);
    expect(criterion(fixtures.opus, models)).toBeCloseTo(0.0);
  });

  it("returns 0 when all values are the same", () => {
    const criterion = minMaxCriterion(() => 5);
    expect(criterion(fixtures.sonnet, allModels)).toBe(0);
  });

  it("handles single model", () => {
    const criterion = minMaxCriterion((m) => m.limit.context);
    const models = [fixtures.sonnet];
    expect(criterion(fixtures.sonnet, models)).toBe(0);
  });
});

// ============================================
// costEfficiency
// ============================================

describe("costEfficiency", () => {
  it("scores cheaper models higher", () => {
    const models = [fixtures.flash, fixtures.sonnet, fixtures.opus];
    expect(costEfficiency(fixtures.flash, models)).toBeGreaterThan(
      costEfficiency(fixtures.sonnet, models)!
    );
    expect(costEfficiency(fixtures.sonnet, models)).toBeGreaterThan(
      costEfficiency(fixtures.opus, models)!
    );
  });

  it("returns 1.0 for cheapest model and 0.0 for most expensive", () => {
    const models = [fixtures.flash, fixtures.opus];
    expect(costEfficiency(fixtures.flash, models)).toBeCloseTo(1.0);
    expect(costEfficiency(fixtures.opus, models)).toBeCloseTo(0.0);
  });

  it("returns 1 when all models have same price (equally efficient)", () => {
    const same = [
      createModel({ id: "a", cost: { input: 3, output: 15 } }),
      createModel({ id: "b", cost: { input: 3, output: 15 } }),
    ];
    expect(costEfficiency(same[0], same)).toBe(1);
    expect(costEfficiency(same[1], same)).toBe(1);
  });

  it("handles single model (returns 1, no competition)", () => {
    const models = [fixtures.sonnet];
    expect(costEfficiency(fixtures.sonnet, models)).toBe(1);
  });

  it("returns undefined for models with missing cost (unknown is not cheap)", () => {
    const unknown = createModel({ id: "unknown-model", cost: undefined });
    const paid = createModel({ id: "paid-model", cost: { input: 5, output: 25 } });
    const models = [unknown, paid];
    expect(costEfficiency(unknown, models)).toBeUndefined();
    expect(costEfficiency(paid, models)).toBeCloseTo(1.0);
  });

  it("produces correct mid-range normalized value", () => {
    const cheap = createModel({ id: "cheap", cost: { input: 0, output: 0 } });
    const mid = createModel({ id: "mid", cost: { input: 5, output: 25 } });
    const expensive = createModel({ id: "expensive", cost: { input: 10, output: 50 } });
    const models = [cheap, mid, expensive];
    expect(costEfficiency(mid, models)).toBeCloseTo(0.5);
  });
});

// ============================================
// contextCapacity
// ============================================

describe("contextCapacity", () => {
  it("scores larger context models higher", () => {
    const models = [fixtures.gpt4o, fixtures.sonnet, fixtures.geminiPro];
    expect(contextCapacity(fixtures.geminiPro, models)).toBeGreaterThan(
      contextCapacity(fixtures.sonnet, models)!
    );
    expect(contextCapacity(fixtures.sonnet, models)).toBeGreaterThan(
      contextCapacity(fixtures.gpt4o, models)!
    );
  });

  it("returns 1.0 for largest and 0.0 for smallest", () => {
    const models = [fixtures.gpt4o, fixtures.geminiPro];
    expect(contextCapacity(fixtures.geminiPro, models)).toBeCloseTo(1.0);
    expect(contextCapacity(fixtures.gpt4o, models)).toBeCloseTo(0.0);
  });

  it("returns 0 when all models have same context window", () => {
    const same = [
      createModel({ id: "a", limit: { context: 128_000, output: 4_096 } }),
      createModel({ id: "b", limit: { context: 128_000, output: 4_096 } }),
    ];
    expect(contextCapacity(same[0], same)).toBe(0);
  });

  it("handles single model (returns 0)", () => {
    const models = [fixtures.sonnet];
    expect(contextCapacity(fixtures.sonnet, models)).toBe(0);
  });

  it("produces correct mid-range normalized value", () => {
    const small = createModel({ id: "small", limit: { context: 0, output: 0 } });
    const mid = createModel({ id: "mid", limit: { context: 50_000, output: 0 } });
    const large = createModel({ id: "large", limit: { context: 100_000, output: 0 } });
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
    expect(recency(fixtures.gpt52, models)).toBeGreaterThan(
      recency(fixtures.sonnet, models)!
    );
    expect(recency(fixtures.sonnet, models)).toBeGreaterThan(
      recency(fixtures.gpt4o, models)!
    );
  });

  it("returns 1.0 for newest and 0.0 for oldest", () => {
    const models = [fixtures.gpt4o, fixtures.gpt52];
    expect(recency(fixtures.gpt52, models)).toBeCloseTo(1.0);
    expect(recency(fixtures.gpt4o, models)).toBeCloseTo(0.0);
  });

  it("returns 0 when all models have same date", () => {
    const same = [
      createModel({ id: "a", releaseDate: "2025-01-01" }),
      createModel({ id: "b", releaseDate: "2025-01-01" }),
    ];
    expect(recency(same[0], same)).toBe(0);
  });

  it("returns undefined for missing releaseDate (uncovered)", () => {
    const noDate = createModel({ id: "no-date" });
    const hasDate = createModel({ id: "has-date", releaseDate: "2025-06-01" });
    const models = [noDate, hasDate];
    expect(recency(noDate, models)).toBeUndefined();
  });

  it("excludes dateless models from the scale (no epoch skew)", () => {
    const noDate = createModel({ id: "no-date" });
    const older = createModel({ id: "older", releaseDate: "2024-01-01" });
    const newer = createModel({ id: "newer", releaseDate: "2025-06-01" });
    const models = [noDate, older, newer];
    // Without the dateless model dragging min to 1970, the dated models
    // span the full 0-1 range instead of bunching near 1.
    expect(recency(older, models)).toBeCloseTo(0.0);
    expect(recency(newer, models)).toBeCloseTo(1.0);
  });

  it("handles single model (returns 0)", () => {
    const models = [fixtures.sonnet];
    expect(recency(fixtures.sonnet, models)).toBe(0);
  });
});

// ============================================
// knowledgeFreshness
// ============================================

describe("knowledgeFreshness", () => {
  it("scores newer knowledge cutoff higher", () => {
    const models = [fixtures.gpt4o, fixtures.sonnet, fixtures.gpt52];
    // gpt4o: 2024-06, sonnet: 2025-03, gpt52: 2025-09
    expect(knowledgeFreshness(fixtures.gpt52, models)).toBeGreaterThan(
      knowledgeFreshness(fixtures.sonnet, models)!
    );
    expect(knowledgeFreshness(fixtures.sonnet, models)).toBeGreaterThan(
      knowledgeFreshness(fixtures.gpt4o, models)!
    );
  });

  it("returns 1.0 for newest knowledge and 0.0 for oldest", () => {
    const old = createModel({ id: "old", knowledge: "2023-01" });
    const newer = createModel({ id: "new", knowledge: "2025-06" });
    const models = [old, newer];
    expect(knowledgeFreshness(newer, models)).toBeCloseTo(1.0);
    expect(knowledgeFreshness(old, models)).toBeCloseTo(0.0);
  });

  it("returns undefined for missing knowledge (uncovered)", () => {
    const noKnowledge = createModel({ id: "no-k" });
    const hasKnowledge = createModel({ id: "has-k", knowledge: "2025-01" });
    const models = [noKnowledge, hasKnowledge];
    expect(knowledgeFreshness(noKnowledge, models)).toBeUndefined();
  });

  it("excludes models without knowledge from the scale", () => {
    const noKnowledge = createModel({ id: "no-k" });
    const older = createModel({ id: "old-k", knowledge: "2024-01" });
    const newer = createModel({ id: "new-k", knowledge: "2025-06" });
    const models = [noKnowledge, older, newer];
    expect(knowledgeFreshness(older, models)).toBeCloseTo(0.0);
    expect(knowledgeFreshness(newer, models)).toBeCloseTo(1.0);
  });

  it("returns 0 when all models have same knowledge", () => {
    const same = [
      createModel({ id: "a", knowledge: "2025-01" }),
      createModel({ id: "b", knowledge: "2025-01" }),
    ];
    expect(knowledgeFreshness(same[0], same)).toBe(0);
  });
});

// ============================================
// outputCapacity
// ============================================

describe("outputCapacity", () => {
  it("scores larger output limit higher", () => {
    const models = [fixtures.haiku, fixtures.sonnet, fixtures.geminiPro];
    // haiku: 8192, sonnet: 16000, geminiPro: 65536
    expect(outputCapacity(fixtures.geminiPro, models)).toBeGreaterThan(
      outputCapacity(fixtures.sonnet, models)!
    );
    expect(outputCapacity(fixtures.sonnet, models)).toBeGreaterThan(
      outputCapacity(fixtures.haiku, models)!
    );
  });

  it("returns 1.0 for largest and 0.0 for smallest", () => {
    const small = createModel({ id: "small", limit: { context: 0, output: 100 } });
    const large = createModel({ id: "large", limit: { context: 0, output: 1000 } });
    const models = [small, large];
    expect(outputCapacity(large, models)).toBeCloseTo(1.0);
    expect(outputCapacity(small, models)).toBeCloseTo(0.0);
  });

  it("returns 0 when all models have same output limit", () => {
    const same = [
      createModel({ id: "a", limit: { context: 0, output: 4096 } }),
      createModel({ id: "b", limit: { context: 0, output: 4096 } }),
    ];
    expect(outputCapacity(same[0], same)).toBe(0);
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
    expect(result[0].id).toBe(fixtures.haiku.id);
    expect(result[result.length - 1].id).toBe(fixtures.opus.id);
  });

  it("normalizes weights to sum to 1", () => {
    const models = [fixtures.haiku, fixtures.sonnet];
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
    const result = scoreModels(allModels, [
      { criterion: costEfficiency, weight: 0.5 },
      { criterion: recency, weight: 0.5 },
    ]);
    for (const m of result) {
      expect(m.score).toBeGreaterThanOrEqual(0);
      expect(m.score).toBeLessThanOrEqual(1);
    }
  });

  it("returns empty array for empty input", () => {
    expect(scoreModels([], [{ criterion: costEfficiency, weight: 1 }])).toEqual([]);
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
    expect(result[0].limit.context).toBe(200_000);
    expect(result[0]).toHaveProperty("score");
  });

  it("with single criterion, scores match that criterion directly", () => {
    const models = [fixtures.flash, fixtures.opus];
    const result = scoreModels(models, [
      { criterion: costEfficiency, weight: 1 },
    ]);
    expect(result[0].id).toBe(fixtures.flash.id);
    expect(result[0].score).toBeCloseTo(costEfficiency(fixtures.flash, models)!);
    expect(result[1].score).toBeCloseTo(costEfficiency(fixtures.opus, models)!);
  });

  it("dominant weight controls ranking", () => {
    const models2 = [fixtures.gpt4oMini, fixtures.gpt52];
    const costHeavy = scoreModels(models2, [
      { criterion: costEfficiency, weight: 0.95 },
      { criterion: recency, weight: 0.05 },
    ]);
    expect(costHeavy[0].id).toBe(fixtures.gpt4oMini.id); // cheaper

    const recencyHeavy2 = scoreModels(models2, [
      { criterion: costEfficiency, weight: 0.05 },
      { criterion: recency, weight: 0.95 },
    ]);
    expect(recencyHeavy2[0].id).toBe(fixtures.gpt52.id); // newer
  });

  it("handles empty criteria array (all scores 0)", () => {
    const models = [fixtures.haiku, fixtures.sonnet];
    const result = scoreModels(models, []);
    expect(result).toHaveLength(2);
    expect(result[0].score).toBe(0);
    expect(result[1].score).toBe(0);
  });

  it("attaches coverage 1 when every criterion has data", () => {
    const models = [fixtures.haiku, fixtures.sonnet];
    const result = scoreModels(models, [
      { criterion: costEfficiency, weight: 1 },
      { criterion: contextCapacity, weight: 1 },
    ]);
    for (const m of result) {
      expect(m.coverage).toBe(1);
    }
  });

  it("coverage reflects the weight of uncovered criteria per model", () => {
    const priced = createModel({ id: "priced", cost: { input: 3, output: 15 } });
    const unpriced = createModel({ id: "unpriced", cost: undefined });
    const result = scoreModels([priced, unpriced], [
      { criterion: costEfficiency, weight: 3 },
      { criterion: contextCapacity, weight: 7 },
    ]);
    const pricedResult = result.find((m) => m.id === "priced")!;
    const unpricedResult = result.find((m) => m.id === "unpriced")!;
    expect(pricedResult.coverage).toBe(1);
    expect(unpricedResult.coverage).toBeCloseTo(0.7);
  });

  it("uncovered criteria contribute 0 to the score", () => {
    const priced = createModel({ id: "priced", cost: { input: 3, output: 15 } });
    const unpriced = createModel({ id: "unpriced", cost: undefined });
    const result = scoreModels([priced, unpriced], [
      { criterion: costEfficiency, weight: 1 },
    ]);
    const unpricedResult = result.find((m) => m.id === "unpriced")!;
    expect(unpricedResult.score).toBe(0);
  });

  it("all-zero weights produce zero coverage", () => {
    const result = scoreModels([fixtures.haiku], [
      { criterion: costEfficiency, weight: 0 },
    ]);
    expect(result[0].coverage).toBe(0);
  });
});

// ============================================
// criterionCoverage
// ============================================

describe("criterionCoverage", () => {
  it("reports full coverage for criteria with data everywhere", () => {
    const models = [fixtures.haiku, fixtures.sonnet];
    const report = criterionCoverage(models, [
      { criterion: contextCapacity, weight: 1 },
    ]);
    expect(report).toEqual([{ label: "contextCapacity", covered: 2, total: 2 }]);
  });

  it("counts only models the criterion has data for", () => {
    const priced = createModel({ id: "priced", cost: { input: 3, output: 15 } });
    const unpriced = createModel({ id: "unpriced", cost: undefined });
    const report = criterionCoverage([priced, unpriced], [
      { criterion: costEfficiency, weight: 1 },
    ]);
    expect(report[0].covered).toBe(1);
    expect(report[0].total).toBe(2);
  });

  it("reports 0 covered for a criterion that never finds data", () => {
    const dead = minMaxCriterion(() => undefined);
    const report = criterionCoverage([fixtures.haiku, fixtures.sonnet], [
      { criterion: dead, weight: 5, label: "tool-calling" },
    ]);
    expect(report).toEqual([{ label: "tool-calling", covered: 0, total: 2 }]);
  });

  it("prefers label, falls back to function name", () => {
    const report = criterionCoverage([fixtures.haiku], [
      { criterion: costEfficiency, weight: 1, label: "cost" },
      { criterion: contextCapacity, weight: 1 },
    ]);
    expect(report[0].label).toBe("cost");
    expect(report[1].label).toBe("contextCapacity");
  });
});
