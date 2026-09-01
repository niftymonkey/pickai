import { describe, it, expect } from "vitest";
import { recommend } from "../recommend";
import { perMaker } from "../constraints";

/** A listing as the catalog carries it, shaped by hand to keep the test fence honest. */
const listing = (id: string, provider: string, extra: Record<string, unknown> = {}) => ({
  id,
  name: id,
  provider,
  limit: { context: 200000, output: 8192 },
  modalities: { input: ["text"], output: ["text"] },
  openRouterId: `${provider}/${id}`,
  ...extra,
});

const catalog = () => [
  listing("alpha-9", "acme", { cost: { input: 15, output: 75 }, releaseDate: "2026-03-01" }),
  listing("alpha-9", "resell-mart", { cost: { input: 18, output: 90 }, releaseDate: "2026-03-01" }),
  listing("beta-2", "bmaker", { cost: { input: 1, output: 4 }, releaseDate: "2026-06-15" }),
  listing("gamma-7", "gmaker", { cost: { input: 5, output: 20 }, releaseDate: "2025-11-20" }),
  listing("delta-4", "dmaker", { cost: { input: 3, output: 12 }, releaseDate: "2026-01-05" }),
  listing("epsilon-5", "emaker", { cost: { input: 8, output: 30 }, releaseDate: "2025-09-01" }),
  listing("zeta-6", "zmaker", { cost: { input: 2, output: 9 }, releaseDate: "2026-04-10" }),
];

/** Cheapest known input rate first; hand-built so the test stays inside its subtree. */
const byInputPrice = (
  a: { representative: { cost?: { input: number } } },
  b: { representative: { cost?: { input: number } } },
) => (a.representative.cost?.input ?? Infinity) - (b.representative.cost?.input ?? Infinity);

/** One benchmark row, shaped by hand; the metrics record is typed so keys stay open. */
const score = (
  modelId: string,
  metrics: Record<string, { value: number; low?: number; high?: number; votes?: number }>,
  maker?: string,
) => (maker === undefined ? { modelId, metrics } : { modelId, maker, metrics });

const benchmarks = () => ({
  source: "test-set",
  measuredAt: "2026-08-01",
  scores: [
    score("alpha-9", { overall: { value: 1300 }, coding: { value: 1200 } }, "acme-labs"),
    score("alpha-9-high", { overall: { value: 1310, low: 1295, high: 1325 } }, "acme-labs"),
    score("beta-2", { overall: { value: 1280 }, coding: { value: 1290 } }, "bmaker-ai"),
    score("gamma-7", { math: { value: 1400 } }, "gmaker-ai"),
    score("unknown-model-x", { overall: { value: 999 } }),
  ],
});

/** Two rated models share a maker, so a perMaker constraint has something to bite. */
const sharedMakerBenchmarks = () => ({
  source: "test-set",
  measuredAt: "2026-08-01",
  scores: [
    score("alpha-9", { overall: { value: 1310 } }, "acme-labs"),
    score("gamma-7", { overall: { value: 1305 } }, "acme-labs"),
    score("beta-2", { overall: { value: 1280 } }, "bmaker-ai"),
  ],
});

describe("recommend", () => {
  it("a weights ordering without a benchmark set throws", () => {
    expect(() => recommend(catalog(), { order: { overall: 1 } })).toThrow(/benchmarks/);
  });

  it("a comparator orders the picks with no benchmark set, unrated and unmatched empty", () => {
    const result = recommend(catalog(), { order: byInputPrice, limit: 3 });
    expect(result.picks.map((pick) => pick.model.key)).toEqual(["beta-2", "zeta-6", "delta-4"]);
    expect(result.unrated).toEqual([]);
    expect(result.unmatched).toEqual([]);
  });

  it("limit defaults to five picks", () => {
    const result = recommend(catalog(), { order: byInputPrice });
    expect(result.picks).toHaveLength(5);
  });

  it("weights rank picks by blended best, highest first, with the blend attached", () => {
    const result = recommend(catalog(), {
      benchmarks: benchmarks(),
      order: { overall: 0.5, coding: 0.5 },
    });
    expect(result.picks.map((pick) => pick.model.key)).toEqual(["beta-2", "alpha-9"]);
    const [beta, alpha] = result.picks;
    // Worked by hand: beta 0.5*1280 + 0.5*1290; alpha 0.5*1310 (best config) + 0.5*1200.
    expect(beta.blend).toMatchObject({ kind: "blend", rating: { best: 1285 } });
    expect(alpha.blend).toMatchObject({ kind: "blend", rating: { best: 1255 } });
  });

  it("a single wanted metric passes provenance through untouched", () => {
    const result = recommend(catalog(), { benchmarks: benchmarks(), order: { overall: 1 } });
    const alpha = result.picks[0];
    expect(alpha.model.key).toBe("alpha-9");
    expect(alpha.blend).toMatchObject({
      kind: "single",
      metric: "overall",
      rating: { best: 1310, bestConfig: "alpha-9-high", configs: 2 },
    });
  });

  it("a model with none of the wanted metrics lands in unrated, never in picks", () => {
    const result = recommend(catalog(), { benchmarks: benchmarks(), order: { overall: 1 } });
    expect(result.picks.map((pick) => pick.model.key)).not.toContain("gamma-7");
    expect(result.unrated.map((model) => model.key)).toContain("gamma-7");
  });
  it("the join runs before the rules, so a metric rule can cut a low scorer", () => {
    const result = recommend(catalog(), {
      benchmarks: benchmarks(),
      order: { overall: 1 },
      filter: [{ kind: "metric", metric: "overall", min: 1290 }],
    });
    expect(result.picks.map((pick) => pick.model.key)).toEqual(["alpha-9"]);
    expect(result.unrated.map((model) => model.key)).not.toContain("beta-2");
    expect(result.steps[0]).toMatchObject({ cutModels: 1 });
  });

  it("filter steps come back in both units", () => {
    const result = recommend(catalog(), {
      order: byInputPrice,
      filter: { maxCostInput: 10, excludeDeprecated: false },
    });
    expect(result.steps).toHaveLength(1);
    expect(result.steps[0]).toMatchObject({ cut: 2, remaining: 5, cutModels: 1, remainingModels: 5 });
  });

  it("benchmark rows that match no model come back as unmatched", () => {
    const result = recommend(catalog(), { benchmarks: benchmarks(), order: { overall: 1 } });
    expect(result.unmatched.map((row) => row.modelId)).toEqual(["unknown-model-x"]);
  });
  it("constraints hold in the first pass", () => {
    const result = recommend(catalog(), {
      benchmarks: sharedMakerBenchmarks(),
      order: { overall: 1 },
      constraints: [perMaker(1)],
      limit: 2,
    });
    expect(result.picks.map((pick) => pick.model.key)).toEqual(["alpha-9", "beta-2"]);
  });

  it("a short first pass backfills ignoring constraints", () => {
    const result = recommend(catalog(), {
      benchmarks: sharedMakerBenchmarks(),
      order: { overall: 1 },
      constraints: [perMaker(1)],
      limit: 3,
    });
    expect(result.picks.map((pick) => pick.model.key)).toEqual(["alpha-9", "beta-2", "gamma-7"]);
  });

  it("a comparator with benchmarks attaches ratings and keeps unrated models in the ranked list", () => {
    const result = recommend(catalog(), { benchmarks: benchmarks(), order: byInputPrice, limit: 6 });
    expect(result.picks.map((pick) => pick.model.key)).toEqual([
      "beta-2",
      "zeta-6",
      "delta-4",
      "gamma-7",
      "epsilon-5",
      "alpha-9",
    ]);
    expect(result.unrated).toEqual([]);
    const alpha = result.picks[5];
    expect(alpha.model.ratings.overall).toMatchObject({ best: 1310, bestConfig: "alpha-9-high" });
    const delta = result.picks[2];
    expect(delta.model.ratings).toEqual({});
  });

  it("a bad weight throws", () => {
    expect(() =>
      recommend(catalog(), { benchmarks: benchmarks(), order: { overall: -1 } }),
    ).toThrow(/invalid weight/);
  });
});
