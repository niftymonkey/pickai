// Weights over named metrics become one rating; the names stay opaque (finding 13).

import type { MetricRating, RatingBand } from "./joinBenchmarks";

type BlendedRating =
  | { kind: "unrated"; wanted: string[] }
  | { kind: "single"; metric: string; rating: MetricRating; wanted: string[] }
  | { kind: "blend"; rating: RatingBand; used: string[]; wanted: string[] };

/** A bad weight is our caller's bug, never repaired (as v2 ruled for scoring weights). */
const assertValidWeights = (weights: Record<string, number>): void => {
  for (const [name, weight] of Object.entries(weights)) {
    if (!Number.isFinite(weight) || weight < 0) {
      throw new Error(`invalid weight for "${name}": ${weight}`);
    }
  }
};

const blendRatings = (
  ratings: Record<string, MetricRating> | undefined,
  weights: Record<string, number>,
): BlendedRating => {
  assertValidWeights(weights);
  const present = ratings ?? {};
  const wanted: string[] = [];
  const parts: { name: string; weight: number; rating: MetricRating }[] = [];
  for (const [name, weight] of Object.entries(weights)) {
    if (weight === 0) continue;
    wanted.push(name);
    const rating = present[name];
    if (rating !== undefined) parts.push({ name, weight, rating });
  }

  if (parts.length === 0) return { kind: "unrated", wanted };
  // One contributing metric passes through untouched so provenance survives (finding 13).
  if (parts.length === 1) {
    return { kind: "single", metric: parts[0].name, rating: parts[0].rating, wanted };
  }

  const total = parts.reduce((sum, part) => sum + part.weight, 0);
  const mix = (pick: (rating: RatingBand) => number): number =>
    parts.reduce((sum, part) => sum + pick(part.rating) * part.weight, 0) / total;
  return {
    kind: "blend",
    rating: {
      best: mix((rating) => rating.best),
      low: mix((rating) => rating.low),
      high: mix((rating) => rating.high),
      min: mix((rating) => rating.min),
      max: mix((rating) => rating.max),
    },
    used: parts.map((part) => part.name),
    wanted,
  };
};

export { blendRatings };
export type { BlendedRating };
