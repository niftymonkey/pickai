import { describe, it, expect } from "vitest";
import { selectModels } from "./select";
import { perProvider, perFamily } from "./constraints";
import type { ScoredModel } from "./types";
import { fixtures } from "./test-utils";

/** Helper: create a ScoredModel from a fixture with a given score */
function scored(fixture: (typeof fixtures)[keyof typeof fixtures], score: number): ScoredModel {
  return { ...fixture, score };
}

// Pre-scored models (sorted descending by score, as scoreModels would return)
const scoredModels: ScoredModel[] = [
  scored(fixtures.opus, 0.95),         // anthropic, claude
  scored(fixtures.sonnet, 0.85),       // anthropic, claude
  scored(fixtures.gpt52, 0.80),        // openai, gpt
  scored(fixtures.geminiPro, 0.75),    // google, gemini
  scored(fixtures.gpt4o, 0.70),        // openai, gpt
  scored(fixtures.haiku, 0.60),        // anthropic, claude
  scored(fixtures.flash, 0.50),        // google, gemini
  scored(fixtures.gpt4oMini, 0.40),    // openai, gpt
];

describe("selectModels", () => {
  it("selects top N models by score (default limit=1)", () => {
    const result = selectModels(scoredModels);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(fixtures.opus.id);
  });

  it("selects top N models by score with limit", () => {
    const result = selectModels(scoredModels, { limit: 3 });
    expect(result).toHaveLength(3);
    expect(result[0].score).toBeGreaterThanOrEqual(result[1].score);
    expect(result[1].score).toBeGreaterThanOrEqual(result[2].score);
  });

  it("returns all models if limit exceeds available", () => {
    const few = scoredModels.slice(0, 2);
    const result = selectModels(few, { limit: 5 });
    expect(result).toHaveLength(2);
  });

  it("first pass picks the highest-scored model from each provider", () => {
    const result = selectModels(scoredModels, {
      limit: 3,
      constraints: [perProvider()],
    });
    expect(result).toHaveLength(3);
    expect(result.map((m) => m.id)).toEqual([
      fixtures.opus.id,
      fixtures.gpt52.id,
      fixtures.geminiPro.id,
    ]);
  });

  it("second pass fills remaining slots in score order", () => {
    const allAnthropic = [
      scored(fixtures.opus, 0.95),
      scored(fixtures.sonnet, 0.85),
      scored(fixtures.haiku, 0.60),
    ];
    const result = selectModels(allAnthropic, {
      limit: 3,
      constraints: [perProvider()],
    });
    expect(result).toHaveLength(3);
    expect(result.map((m) => m.id)).toEqual([
      fixtures.opus.id,
      fixtures.sonnet.id,
      fixtures.haiku.id,
    ]);
  });

  it("returns empty array for empty input", () => {
    expect(selectModels([])).toEqual([]);
  });

  it("preserves score ordering without constraints", () => {
    const result = selectModels(scoredModels, { limit: 5 });
    expect(result).toHaveLength(5);
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
      limit: 3,
      constraints: [perProvider(), perFamily()],
    });
    // Must satisfy both: diverse providers AND diverse families
    expect(result).toHaveLength(3);
    expect(new Set(result.map((m) => m.provider)).size).toBe(3);
    expect(new Set(result.map((m) => m.family)).size).toBe(3);
  });

  it("works with perFamily constraint", () => {
    const result = selectModels(scoredModels, {
      limit: 3,
      constraints: [perFamily()],
    });
    expect(result).toHaveLength(3);
    // First from each family: opus (claude), gpt52 (gpt), geminiPro (gemini)
    expect(result.map((m) => m.id)).toEqual([
      fixtures.opus.id,
      fixtures.gpt52.id,
      fixtures.geminiPro.id,
    ]);
  });
});
