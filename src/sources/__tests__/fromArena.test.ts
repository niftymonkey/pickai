import { describe, expect, it } from "vitest";
import { parseArenaRows } from "../fromArena";
import type { ArenaRow } from "../fromArena";

/** A row as datasets-server returns it, shaped by hand from the finding-8 schema. */
const row = (
  model_name: string,
  category: string,
  rating: number,
  extra: Record<string, unknown> = {},
): ArenaRow => ({
  row: {
    model_name,
    category,
    rating,
    organization: "TestOrg",
    license: "Proprietary",
    rating_lower: rating - 5,
    rating_upper: rating + 5,
    vote_count: 1000,
    leaderboard_publish_date: "2026-08-25",
    ...extra,
  },
});

describe("parseArenaRows", () => {
  it("builds one score per configuration with metrics across categories", () => {
    const set = parseArenaRows([
      row("claude-opus-5", "overall", 1450),
      row("claude-opus-5", "coding", 1440),
      row("gpt-5.2-high", "overall", 1469),
    ]);
    expect(set.source).toBe("LMArena");
    expect(set.scores).toHaveLength(2);
    const opus = set.scores.find((score) => score.modelId === "claude-opus-5");
    expect(opus?.metrics.overall.value).toBe(1450);
    expect(opus?.metrics.coding.value).toBe(1440);
  });

  it("carries every category the dataset publishes, none curated away", () => {
    const set = parseArenaRows([
      row("claude-opus-5", "overall", 1450),
      row("claude-opus-5", "industry_legal_and_government", 1433),
      row("claude-opus-5", "korean", 1441),
    ]);
    expect(Object.keys(set.scores[0].metrics).sort()).toEqual([
      "industry_legal_and_government",
      "korean",
      "overall",
    ]);
  });

  // 50 live rows carried organization "" on 2026-08-31; an empty name is no maker at all.
  it("an empty organization means no maker, never a maker named the empty string", () => {
    const set = parseArenaRows([row("intellect-3", "overall", 1300, { organization: "" })]);
    expect(set.scores[0].maker).toBeUndefined();
  });

  it("carries organization as the score's maker and the per-row license", () => {
    const set = parseArenaRows([
      row("glm-4-6", "overall", 1400, { organization: "Zhipu", license: "MIT" }),
    ]);
    expect(set.scores[0].maker).toBe("Zhipu");
    expect(set.scores[0].license).toBe("MIT");
  });

  it("carries votes and confidence bounds through unrounded", () => {
    const set = parseArenaRows([
      row("claude-opus-5", "overall", 1450.37, {
        rating_lower: 1444.12,
        rating_upper: 1456.91,
        vote_count: 72104,
      }),
    ]);
    const metric = set.scores[0].metrics.overall;
    expect(metric.value).toBe(1450.37);
    expect(metric.low).toBe(1444.12);
    expect(metric.high).toBe(1456.91);
    expect(metric.votes).toBe(72104);
  });

  it("takes measuredAt from the rows", () => {
    const set = parseArenaRows([
      row("claude-opus-5", "overall", 1450, { leaderboard_publish_date: "2026-08-25" }),
    ]);
    expect(set.measuredAt).toBe("2026-08-25");
  });

  it("throws on a malformed row, naming what broke", () => {
    expect(() =>
      parseArenaRows([row("claude-opus-5", "overall", Number.NaN)]),
    ).toThrow(/rating/);
    expect(() =>
      parseArenaRows([{ row: { category: "overall", rating: 1450 } }]),
    ).toThrow(/model_name/);
  });

  it("throws when there are no rows", () => {
    expect(() => parseArenaRows([])).toThrow(/no rows/);
  });
});
