import { describe, expect, test } from "vitest";
import { blendRatings } from "../blendRatings";
import type { MetricRating } from "../joinBenchmarks";

/** A rating as the join would build it, one configuration unless said otherwise. */
const rating = (best: number, extra: Partial<MetricRating> = {}): MetricRating => ({
  best,
  low: best - 10,
  high: best + 10,
  min: best,
  max: best,
  bestConfig: `config-${best}`,
  configs: 1,
  ...extra,
});

describe("blendRatings", () => {
  test("blends two weighted metrics as a weighted average", () => {
    const blended = blendRatings(
      { overall: rating(1400), coding: rating(1300) },
      { overall: 3, coding: 1 },
    );
    expect(blended.kind).toBe("blend");
    if (blended.kind !== "blend") return;
    expect(blended.rating.best).toBe(1375);
    expect(blended.rating.low).toBe(1365);
    expect(blended.rating.high).toBe(1385);
    expect(blended.used).toEqual(["overall", "coding"]);
    expect(blended.wanted).toEqual(["overall", "coding"]);
  });

  test("renormalizes over the metrics present and reports used against wanted", () => {
    const blended = blendRatings(
      { overall: rating(1400), coding: rating(1300) },
      { overall: 1, coding: 1, math: 1 },
    );
    expect(blended.kind).toBe("blend");
    if (blended.kind !== "blend") return;
    expect(blended.rating.best).toBe(1350);
    expect(blended.used).toEqual(["overall", "coding"]);
    expect(blended.wanted).toEqual(["overall", "coding", "math"]);
  });

  test("returns unrated when the model has none of the weighted metrics", () => {
    expect(blendRatings({ overall: rating(1400) }, { math: 1 })).toEqual({
      kind: "unrated",
      wanted: ["math"],
    });
    expect(blendRatings(undefined, { overall: 1 })).toEqual({
      kind: "unrated",
      wanted: ["overall"],
    });
  });

  test("passes a single contributing metric through untouched so provenance survives", () => {
    const coding = rating(1430, { votes: 9001, configs: 2 });
    const alone = blendRatings({ coding }, { coding: 2 });
    expect(alone).toEqual({ kind: "single", metric: "coding", rating: coding, wanted: ["coding"] });
    // Two metrics wanted, one present: still a passthrough, and wanted says what is missing.
    const partial = blendRatings({ coding }, { overall: 1, coding: 1 });
    expect(partial).toEqual({
      kind: "single",
      metric: "coding",
      rating: coding,
      wanted: ["overall", "coding"],
    });
  });

  test("ignores zero-weight entries", () => {
    const overall = rating(1400);
    const blended = blendRatings({ overall, coding: rating(1300) }, { overall: 1, coding: 0 });
    expect(blended).toEqual({ kind: "single", metric: "overall", rating: overall, wanted: ["overall"] });
  });

  test("throws on a negative or non-finite weight", () => {
    expect(() => blendRatings({ overall: rating(1400) }, { overall: -1 })).toThrow();
    expect(() => blendRatings({ overall: rating(1400) }, { overall: Number.NaN })).toThrow();
    expect(() => blendRatings({ overall: rating(1400) }, { overall: Number.POSITIVE_INFINITY })).toThrow();
  });
});
