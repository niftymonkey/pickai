// Scores over the catalog: the join, the metric vocabulary, blend weights, and score-ordered rows.

import { blendRatings, joinBenchmarks } from "pickai";
import type { BenchmarkSet, BlendedRating, MetricRating, ModelIdentity } from "pickai";
import { rowFromIdentity } from "./catalog-view";
import type { CatalogRow } from "./catalog-view";

/** A model identity that may carry ratings from a benchmark join. */
interface ScorableIdentity extends ModelIdentity {
  ratings?: Record<string, MetricRating>;
}

interface Metric {
  name: string;
  label: string;
}

type ScoreCell =
  | { kind: "unrated" }
  | {
      kind: "rated";
      /** The rounded blended value shown in the cell. */
      value: number;
      /** Band ends: the confidence interval, unrounded. */
      low: number;
      high: number;
      /** Votes or blend-shortfall note; null when there is nothing to say. */
      note: string | null;
      /** Rival-configuration note; null when one config or a true blend. */
      configNote: string | null;
    };

interface ScoredRow extends CatalogRow {
  score: ScoreCell;
}

interface ScoreBoard {
  rows: ScoredRow[];
  /** The band scale across every rated row; null when none are rated. */
  scale: { min: number; max: number } | null;
  unratedCount: number;
}

const rateIdentities = (
  identities: ModelIdentity[],
  set: BenchmarkSet | null,
): ScorableIdentity[] => {
  if (set === null) return identities;
  const { joined, unscored } = joinBenchmarks(identities, set);
  return [...joined, ...unscored];
};

// Names a source is known to publish, in display order; anything else appends alphabetically.
const KNOWN_METRICS: Metric[] = [
  { name: "overall", label: "Overall" },
  { name: "coding", label: "Coding" },
  { name: "math", label: "Math" },
  { name: "hard_prompts", label: "Hard prompts" },
  { name: "creative_writing", label: "Creative writing" },
  { name: "instruction_following", label: "Instruction following" },
  { name: "intelligence_index", label: "Intelligence" },
  { name: "coding_index", label: "Coding" },
  { name: "agentic_index", label: "Agentic" },
];

const humanized = (name: string): string => {
  const words = name.replaceAll("_", " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
};

const metricLabel = (name: string): string =>
  KNOWN_METRICS.find((metric) => metric.name === name)?.label ?? humanized(name);

const metricList = (set: BenchmarkSet | null): Metric[] => {
  if (set === null) return [];
  const present = new Set<string>();
  for (const score of set.scores) {
    for (const name in score.metrics) present.add(name);
  }
  const known = KNOWN_METRICS.filter(({ name }) => present.has(name));
  const unknown = [...present]
    .filter((name) => !KNOWN_METRICS.some((metric) => metric.name === name))
    .sort()
    .map((name) => ({ name, label: humanized(name) }));
  return [...known, ...unknown];
};

const defaultWeights = (set: BenchmarkSet | null): Record<string, number> =>
  Object.fromEntries(metricList(set).map(({ name }, index) => [name, index === 0 ? 1 : 0]));

/**
 * The surface offers a curated slice of a set (the adapter itself emits every
 * metric, 9.34): each score keeps only the named metrics, empty scores drop.
 */
const keepMetrics = (set: BenchmarkSet, names: string[]): BenchmarkSet => ({
  ...set,
  scores: set.scores
    .map((score) => ({
      ...score,
      metrics: Object.fromEntries(
        Object.entries(score.metrics).filter(([name]) => names.includes(name)),
      ),
    }))
    .filter((score) => Object.keys(score.metrics).length > 0),
});

const WEIGHT_MAX = 5;

const stepWeight = (
  weights: Record<string, number>,
  name: string,
  delta: 1 | -1,
): Record<string, number> => {
  const current = weights[name] ?? 0;
  const next = Math.min(WEIGHT_MAX, Math.max(0, current + delta));
  // The blend never reaches all-zeros: the last positive weight cannot drop below 1.
  const lastPositive =
    current > 0 && Object.entries(weights).every(([other, weight]) => other === name || weight === 0);
  return { ...weights, [name]: lastPositive ? Math.max(1, next) : next };
};

/** Positive weights in the metric vocabulary's order, ready to render. */
const positiveInDisplayOrder = (
  weights: Record<string, number>,
): { name: string; weight: number }[] => {
  const positive = Object.entries(weights)
    .filter(([, weight]) => weight > 0)
    .map(([name, weight]) => ({ name, weight }));
  const rank = (name: string): number => {
    const known = KNOWN_METRICS.findIndex((metric) => metric.name === name);
    return known === -1 ? KNOWN_METRICS.length : known;
  };
  return positive.sort((a, b) => rank(a.name) - rank(b.name) || a.name.localeCompare(b.name));
};

/** "A, B and C" from a list of already-worded parts. */
const listed = (parts: string[]): string =>
  parts.length <= 1
    ? (parts[0] ?? "")
    : `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;

/**
 * The blend spoken as a sentence. One weighted metric is that metric's rating,
 * not "100% of it": a percentage of a single thing reads as a score, not a mix.
 * The last share absorbs the rounding, so the shares always total 100.
 */
const blendSentence = (weights: Record<string, number>): string | null => {
  const positive = positiveInDisplayOrder(weights);
  if (positive.length === 0) return null;
  if (positive.length === 1) return `Every score is the ${metricLabel(positive[0].name)} rating.`;
  const total = positive.reduce((sum, { weight }) => sum + weight, 0);
  const shares = positive.map(({ weight }) => Math.round((weight / total) * 100));
  shares[shares.length - 1] = 100 - shares.slice(0, -1).reduce((sum, share) => sum + share, 0);
  const parts = positive.map(({ name }, index) => `${shares[index]}% ${metricLabel(name)}`);
  return `Every score is ${listed(parts)}.`;
};

/** A hair of minimum width keeps a tight interval visible on the band. */
const BAND_MIN_WIDTH_PCT = 3;

/**
 * Where a score's interval sits on the shared band scale, as percentages.
 * The span is clamped to stay inside the track: a top score whose interval is a
 * point starts at the scale's max, and an unclamped left would leave no width.
 */
const bandSpan = (
  score: { low: number; high: number },
  scale: { min: number; max: number },
): { left: number; width: number } => {
  const span = scale.max - scale.min;
  if (span <= 0) return { left: 0, width: 100 };
  const width = Math.min(100, Math.max(BAND_MIN_WIDTH_PCT, ((score.high - score.low) / span) * 100));
  const left = Math.min(100 - width, Math.max(0, ((score.low - scale.min) / span) * 100));
  return { left, width };
};

const votesNote = (votes: number | undefined): string | null =>
  votes === undefined ? null : `${votes.toLocaleString("en-US")} votes`;

// The note exists to show a rival-config spread; identically rated rivals have none to show.
const configNote = (rating: MetricRating): string | null =>
  rating.configs > 1 && rating.min !== rating.max
    ? `${rating.configs} configs, ${Math.round(rating.min)}-${Math.round(rating.max)} (best: ${rating.bestConfig})`
    : null;

const scoreCell = (blend: BlendedRating): ScoreCell => {
  switch (blend.kind) {
    case "unrated":
      return { kind: "unrated" };
    case "single": {
      const { rating, wanted } = blend;
      // Two or more weighted metrics make this a shortfall blend: no votes, no config note.
      const shortfall = wanted.length >= 2;
      return {
        kind: "rated",
        value: Math.round(rating.best),
        low: rating.low,
        high: rating.high,
        note: shortfall ? `1/${wanted.length} weighted metrics` : votesNote(rating.votes),
        configNote: shortfall ? null : configNote(rating),
      };
    }
    case "blend": {
      const { rating, used, wanted } = blend;
      return {
        kind: "rated",
        value: Math.round(rating.best),
        low: rating.low,
        high: rating.high,
        note: used.length < wanted.length ? `${used.length}/${wanted.length} weighted metrics` : null,
        configNote: null,
      };
    }
  }
};

const byName = (a: ScoredRow, b: ScoredRow): number => a.name.localeCompare(b.name);

const scoreBoard = (
  survivors: ScorableIdentity[],
  weights: Record<string, number>,
): ScoreBoard => {
  const scored = survivors.map(
    (identity): ScoredRow => ({
      ...rowFromIdentity(identity),
      score: scoreCell(blendRatings(identity.ratings, weights)),
    }),
  );
  const rated = scored
    .filter((row) => row.score.kind === "rated")
    .sort((a, b) => {
      const gap = (b.score.kind === "rated" ? b.score.value : 0) - (a.score.kind === "rated" ? a.score.value : 0);
      return gap !== 0 ? gap : byName(a, b);
    });
  const unrated = scored.filter((row) => row.score.kind === "unrated").sort(byName);

  let scale: ScoreBoard["scale"] = null;
  for (const { score } of rated) {
    if (score.kind !== "rated") continue;
    scale =
      scale === null
        ? { min: score.low, max: score.high }
        : { min: Math.min(scale.min, score.low), max: Math.max(scale.max, score.high) };
  }
  return { rows: [...rated, ...unrated], scale, unratedCount: unrated.length };
};

export {
  rateIdentities,
  metricLabel,
  metricList,
  defaultWeights,
  keepMetrics,
  stepWeight,
  blendSentence,
  bandSpan,
  scoreBoard,
};
export type { ScorableIdentity, Metric, ScoreCell, ScoredRow, ScoreBoard };
