import { describe, expect, test } from "vitest";
import { joinBenchmarks } from "../joinBenchmarks";
import type { BenchmarkScore, BenchmarkSet, MetricValue } from "../benchmarkSet";

/** A listing as the catalog carries it, shaped by hand to keep the test fence honest. */
const listing = (id: string, provider: string) => ({
  id,
  name: id,
  provider,
  limit: { context: 200000, output: 8192 },
  modalities: { input: ["text"], output: ["text"] },
  openRouterId: `${provider}/${id}`,
});

/** An identity as groupByModel would build it. */
const identity = (key: string, maker: string | null) => {
  const entry = listing(key, maker ?? "someseller");
  return { key, maker, representative: entry, listings: [entry] };
};

const metric = (value: number, extra: Partial<MetricValue> = {}): MetricValue => ({
  value,
  ...extra,
});

const score = (
  modelId: string,
  metrics: Record<string, MetricValue>,
  extra: Partial<BenchmarkScore> = {},
): BenchmarkScore => ({ modelId, metrics, ...extra });

const set = (scores: BenchmarkScore[]): BenchmarkSet => ({
  source: "test",
  measuredAt: "2026-08-31",
  scores,
});

describe("joinBenchmarks", () => {
  test("joins a score to the identity whose normalized id matches", () => {
    const opus = identity("claude-opus-5", "anthropic");
    const result = joinBenchmarks([opus], set([score("Claude Opus 5", { overall: metric(1450) })]));
    expect(result.joined).toHaveLength(1);
    expect(result.joined[0].key).toBe("claude-opus-5");
    expect(result.joined[0].ratings.overall.best).toBe(1450);
    expect(result.unmatched).toEqual([]);
    expect(result.unscored).toEqual([]);
  });

  test("folds a reasoning-effort suffix so a -high configuration rates its base model", () => {
    const gpt = identity("gpt-5-2", "openai");
    const result = joinBenchmarks([gpt], set([score("gpt-5.2-high", { overall: metric(1469) })]));
    expect(result.joined).toHaveLength(1);
    expect(result.joined[0].ratings.overall.best).toBe(1469);
    expect(result.joined[0].ratings.overall.bestConfig).toBe("gpt-5.2-high");
  });

  test("carries every rival configuration, labels the best, and reports the spread", () => {
    const gpt = identity("gpt-5-2", "openai");
    const rivals = set([
      score("gpt-5.2", { overall: metric(1450) }),
      score("gpt-5.2-high", { overall: metric(1469) }),
    ]);
    const rating = joinBenchmarks([gpt], rivals).joined[0].ratings.overall;
    expect(rating.best).toBe(1469);
    expect(rating.bestConfig).toBe("gpt-5.2-high");
    expect(rating.min).toBe(1450);
    expect(rating.max).toBe(1469);
    expect(rating.configs).toBe(2);
  });

  test("returns scores that match no identity as unmatched", () => {
    const opus = identity("claude-opus-5", "anthropic");
    const stray = score("some-model-nobody-catalogs", { overall: metric(1200) });
    const result = joinBenchmarks([opus], set([stray]));
    expect(result.unmatched).toEqual([stray]);
    expect(result.joined).toEqual([]);
    expect(result.unscored).toEqual([opus]);
  });

  test("returns identities with no score as unscored", () => {
    const opus = identity("claude-opus-5", "anthropic");
    const quiet = identity("davinci-002", "openai");
    const result = joinBenchmarks([opus, quiet], set([score("claude-opus-5", { overall: metric(1450) })]));
    expect(result.unscored).toEqual([quiet]);
    expect(result.joined.map((joined) => joined.key)).toEqual(["claude-opus-5"]);
  });

  test("fills a null maker from the score's maker and never overwrites a known one", () => {
    const unknown = identity("glm-4-6", null);
    const known = identity("claude-opus-5", "anthropic");
    const result = joinBenchmarks(
      [unknown, known],
      set([
        score("glm-4-6", { overall: metric(1400) }, { maker: "Zhipu" }),
        score("claude-opus-5", { overall: metric(1450) }, { maker: "SomeoneElse" }),
      ]),
    );
    expect(result.joined[0].maker).toBe("Zhipu");
    expect(result.joined[1].maker).toBe("anthropic");
  });

  test("carries every metric name the set contains, none curated away", () => {
    const opus = identity("claude-opus-5", "anthropic");
    const exotic = set([
      score("claude-opus-5", { overall: metric(1450), tau_banking: metric(87), ifbench: metric(1) }),
    ]);
    const { ratings } = joinBenchmarks([opus], exotic).joined[0];
    expect(Object.keys(ratings).sort()).toEqual(["ifbench", "overall", "tau_banking"]);
  });

  test("writes the judged metrics map from each metric's best rating", () => {
    const gpt = identity("gpt-5-2", "openai");
    const rivals = set([
      score("gpt-5.2", { overall: metric(1450), coding: metric(1430) }),
      score("gpt-5.2-high", { overall: metric(1469) }),
    ]);
    const { metrics } = joinBenchmarks([gpt], rivals).joined[0];
    expect(metrics).toEqual({ overall: 1469, coding: 1430 });
  });

  test("carries votes and confidence bounds through from the best configuration", () => {
    const opus = identity("claude-opus-5", "anthropic");
    const measured = set([
      score("claude-opus-5", { overall: metric(1450, { low: 1444, high: 1456, votes: 12345 }) }),
    ]);
    const rating = joinBenchmarks([opus], measured).joined[0].ratings.overall;
    expect(rating.low).toBe(1444);
    expect(rating.high).toBe(1456);
    expect(rating.votes).toBe(12345);
  });
});
