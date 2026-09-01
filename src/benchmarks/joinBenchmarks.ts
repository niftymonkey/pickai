// The join: benchmark scores folded onto model identities, misses visible in both directions.

import type { ModelIdentity } from "../catalog/groupByModel";
import { normalizeModelId } from "../identity/normalizeModelId";
import type { BenchmarkScore, BenchmarkSet } from "./benchmarkSet";

/** The numbers a rating renders from: the judged value, its bounds, and the rival-config spread. */
interface RatingBand {
  best: number;
  low: number;
  high: number;
  min: number;
  max: number;
}

/** One metric's carriage: every rival configuration kept, the best one labeled (9.27). */
interface MetricRating extends RatingBand {
  bestConfig: string;
  configs: number;
  votes?: number;
}

interface RatedIdentity extends ModelIdentity {
  ratings: Record<string, MetricRating>;
  metrics: Record<string, number>;
}

interface JoinResult {
  joined: RatedIdentity[];
  unmatched: BenchmarkScore[];
  unscored: ModelIdentity[];
}

/** Sources rate reasoning-effort configurations separately; the join folds them (9.14). */
const EFFORT_SUFFIXES = ["-high", "-medium", "-low", "-minimal", "-thinking"];

const foldEffort = (normalizedId: string): string => {
  for (const suffix of EFFORT_SUFFIXES) {
    if (normalizedId.endsWith(suffix)) return normalizedId.slice(0, -suffix.length);
  }
  return normalizedId;
};

const firstNamedMaker = (configs: BenchmarkScore[]): string | null => {
  for (const config of configs) {
    if (config.maker !== undefined) return config.maker;
  }
  return null;
};

const rateMetrics = (configs: BenchmarkScore[]): Record<string, MetricRating> => {
  const names = new Set<string>();
  for (const config of configs) {
    for (const name in config.metrics) names.add(name);
  }
  const ratings: Record<string, MetricRating> = {};
  for (const name of names) {
    let best: BenchmarkScore | undefined;
    let min = Infinity;
    let max = -Infinity;
    let count = 0;
    for (const config of configs) {
      const measured = config.metrics[name];
      if (measured === undefined) continue;
      count += 1;
      min = Math.min(min, measured.value);
      max = Math.max(max, measured.value);
      if (best === undefined || measured.value > best.metrics[name].value) best = config;
    }
    if (best === undefined) continue;
    const measured = best.metrics[name];
    const rating: MetricRating = {
      best: measured.value,
      bestConfig: best.modelId,
      low: measured.low ?? measured.value,
      high: measured.high ?? measured.value,
      min,
      max,
      configs: count,
    };
    if (measured.votes !== undefined) rating.votes = measured.votes;
    ratings[name] = rating;
  }
  return ratings;
};

const joinBenchmarks = (identities: ModelIdentity[], set: BenchmarkSet): JoinResult => {
  const scoresByKey = new Map<string, BenchmarkScore[]>();
  for (const score of set.scores) {
    const key = foldEffort(normalizeModelId(score.modelId));
    const group = scoresByKey.get(key);
    if (group) group.push(score);
    else scoresByKey.set(key, [score]);
  }

  const joined: RatedIdentity[] = [];
  const unscored: ModelIdentity[] = [];
  const matchedKeys = new Set<string>();
  for (const identity of identities) {
    const configs = scoresByKey.get(identity.key);
    if (configs === undefined) {
      unscored.push(identity);
      continue;
    }
    matchedKeys.add(identity.key);
    const ratings = rateMetrics(configs);
    const metrics: Record<string, number> = {};
    for (const name in ratings) metrics[name] = ratings[name].best;
    joined.push({
      ...identity,
      maker: identity.maker ?? firstNamedMaker(configs),
      ratings,
      metrics,
    });
  }

  const unmatched: BenchmarkScore[] = [];
  for (const [key, group] of scoresByKey) {
    if (!matchedKeys.has(key)) unmatched.push(...group);
  }
  return { joined, unmatched, unscored };
};

export { joinBenchmarks };
export type { RatingBand, MetricRating, RatedIdentity, JoinResult };
