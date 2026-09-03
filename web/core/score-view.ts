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
  /** Every metric the source measured for this model; the panel breaks them out. */
  ratings: Record<string, MetricRating> | undefined;
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

const defaultWeights = (metrics: Metric[]): Record<string, number> =>
  Object.fromEntries(metrics.map(({ name }, index) => [name, index === 0 ? 1 : 0]));

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

// A chip label is not always a sentence word: "Overall" is a fine chip and a bad
// noun. A category may carry a prose form used only inside the sentence.
const SENTENCE_LABELS: Record<string, string> = {
  overall: "Overall rating",
  // A chip says what the axis is; the sentence has to say which way is better.
  price: "lower prices",
};

const sentenceLabel = (name: string): string => SENTENCE_LABELS[name] ?? metricLabel(name);

/**
 * The blend spoken as intent, not as arithmetic. Percentages describe the sum and
 * never say what matters: "67% Coding, 33% Intelligence" does not say that coding
 * leads and intelligence still counts. The sentence is a ladder read against the
 * biggest weight, not against 100.
 */
const blendSentence = (weights: Record<string, number>): string | null => {
  const positive = positiveInDisplayOrder(weights);
  if (positive.length === 0) return null;
  if (positive.length === 1) return `Ordered by ${sentenceLabel(positive[0].name)}.`;

  const byWeight = [...positive].sort((a, b) => b.weight - a.weight);
  const total = byWeight.reduce((sum, { weight }) => sum + weight, 0);
  const leader = byWeight[0];
  const rest = byWeight.slice(1);

  if (rest.every(({ weight }) => weight === leader.weight)) {
    return `Ordered by ${listed(byWeight.map(({ name }) => metricLabel(name)))} equally.`;
  }

  // A leader holding half the total or more stands above everything, however close
  // the runner-up sits; every other category is seasoning.
  if (leader.weight * 2 >= total) {
    const seasoning = listed(rest.map(({ name }) => metricLabel(name)));
    return `Ordered by ${metricLabel(leader.name)} above all, with some ${seasoning}.`;
  }

  // Otherwise the leader is first among rungs: a category holding at least half of
  // what the leader holds earns its own rung, and the remainder is seasoning.
  const rungs = rest.filter(({ weight }) => weight * 2 >= leader.weight);
  const seasoning = rest.filter(({ weight }) => weight * 2 < leader.weight);
  const ladder = [
    `Ordered by ${metricLabel(leader.name)} first`,
    ...rungs.map(({ name }) => `then ${metricLabel(name)}`),
  ];
  if (seasoning.length > 0) {
    ladder.push(`with some ${listed(seasoning.map(({ name }) => metricLabel(name)))}`);
  }
  return `${ladder.join(", ")}.`;
};

/** The order clause alone, for a sentence that wraps it. No leading words, no stop. */
const orderClause = (weights: Record<string, number>): string | null => {
  const sentence = blendSentence(weights);
  if (sentence === null) return null;
  return sentence.replace(/^Ordered by /, "").replace(/\.$/, "");
};

/**
 * The decision line: what the rules left standing and what puts it in that order, in
 * one sentence. At first paint there is no count in it, because with no rule active a
 * count of the whole catalog is the census printed twice.
 */
const decisionSentence = ({
  survivors,
  total,
  ruleCount,
  weights,
}: {
  survivors: number;
  total: number;
  ruleCount: number;
  weights: Record<string, number>;
}): string => {
  const clause = orderClause(weights);
  const order = clause === null ? "in catalog order" : `ordered by ${clause}`;
  if (ruleCount === 0) {
    return clause === null ? "In catalog order." : `Ordered by ${clause}.`;
  }
  const n = (value: number): string => value.toLocaleString("en-US");
  return `${n(survivors)} of ${n(total)} models pass your ${ruleCount} ${
    ruleCount === 1 ? "rule" : "rules"
  }, ${order}.`;
};

/** What just happened to the top of the board, and why it is worth a line. */
type BoardAction =
  | { kind: "rule"; words: string; on: boolean }
  | { kind: "weight"; label: string }
  | { kind: "source"; label: string; rated: number };

interface DeltaNote {
  /** The lead clause, in accent ink. */
  lead: string;
  /** The quieter half; null when the lead says it all. */
  quiet: string | null;
}

const TOP_ROWS = 10;
const NAMED_ARRIVALS = 3;

const arrivalWords = (names: string[]): string =>
  names.length <= NAMED_ARRIVALS
    ? listed(names)
    : `${names.slice(0, NAMED_ARRIVALS).join(", ")} and ${names.length - NAMED_ARRIVALS} more`;

/**
 * The change note under the decision line: what the last move did to the top of the
 * board. A rule that cuts thousands and leaves the top ten untouched has taught you
 * something, and the board alone cannot say it.
 */
const deltaNote = (
  action: BoardAction,
  before: string[],
  after: { key: string; name: string }[],
): DeltaNote => {
  if (action.kind === "source") {
    return {
      lead: `Now ordering by ${action.label}.`,
      quiet: `${action.rated.toLocaleString("en-US")} models carry a score there.`,
    };
  }
  const known = new Set(before);
  const arrivals = after.filter(({ key }) => !known.has(key));
  if (action.kind === "weight") {
    return arrivals.length === 0
      ? { lead: "Weighting changed.", quiet: "Same top 10." }
      : {
          lead: `${action.label} now carries the order.`,
          quiet: `It moved ${arrivals.length} of the top ${TOP_ROWS}.`,
        };
  }
  if (!action.on) return { lead: `${action.words} removed.`, quiet: null };
  if (arrivals.length === 0) {
    return {
      lead: `${action.words}: same top ${TOP_ROWS}.`,
      quiet: "Everything at the top already qualified.",
    };
  }
  return {
    lead: `${action.words} replaced ${arrivals.length} of the top ${TOP_ROWS}.`,
    quiet: `Brought in ${arrivalWords(arrivals.map(({ name }) => name))}.`,
  };
};

/** The keys of the rows the change note compares, newest board first. */
const topKeys = (rows: { key: string }[]): string[] =>
  rows.slice(0, TOP_ROWS).map(({ key }) => key);

/** The top rows the change note names, newest board first. */
const topRows = (rows: { key: string; name: string }[]): { key: string; name: string }[] =>
  rows.slice(0, TOP_ROWS).map(({ key, name }) => ({ key, name }));

/**
 * The catalog census: a receipt about the data, not about the rules, so it does
 * not move as rules are applied. Its scored and unscored halves follow the active
 * source.
 */
const catalogReceipt = ({
  listings,
  models,
  scored,
}: {
  listings: number;
  models: number;
  scored: number;
}): string => {
  const n = (value: number): string => value.toLocaleString("en-US");
  // The source is not named here: the switch a few lines up already says who is scoring.
  return `${n(listings)} listings \u2192 ${n(models)} models \u00b7 ${n(scored)} scored \u00b7 ${n(models - scored)} unscored`;
};

// The panel's bar fills from the scale's low end to the value, so its length is
// the score. The floating-interval band it replaces drew only the confidence
// interval, which read as a stray dot on a scale 400 points wide.
const FILL_MIN_PCT = 1.5;

/** How much of a metric bar is filled, as a percentage of the shared scale. */
const fillPercent = (value: number, scale: { min: number; max: number }): number => {
  const span = scale.max - scale.min;
  if (span <= 0) return 100;
  return Math.min(100, Math.max(FILL_MIN_PCT, ((value - scale.min) / span) * 100));
};

/**
 * One scale for every metric, not one per metric. All of a source's categories
 * are the same unit, and per-metric scales made lengths look comparable down a
 * panel when they were not: a lower math score drew a longer bar than a higher
 * coding one.
 */
const sharedScale = (
  identities: ScorableIdentity[],
): { min: number; max: number } | null => {
  let scale: { min: number; max: number } | null = null;
  for (const { ratings } of identities) {
    if (ratings === undefined) continue;
    for (const name in ratings) {
      const { best } = ratings[name];
      scale =
        scale === null
          ? { min: best, max: best }
          : { min: Math.min(scale.min, best), max: Math.max(scale.max, best) };
    }
  }
  return scale;
};

/**
 * Each model's place per metric, among the models the source measured in that
 * category. Ties share the better place, and the count is per metric because a
 * source does not measure every model in every category.
 */
const metricRanks = (
  identities: ScorableIdentity[],
): Record<string, { places: Record<string, number>; measured: number }> => {
  const byMetric: Record<string, { key: string; value: number }[]> = {};
  for (const { key, ratings } of identities) {
    if (ratings === undefined) continue;
    for (const name in ratings) {
      byMetric[name] ??= [];
      byMetric[name].push({ key, value: ratings[name].best });
    }
  }
  const ranked: Record<string, { places: Record<string, number>; measured: number }> = {};
  for (const name in byMetric) {
    const ordered = [...byMetric[name]].sort((a, b) => b.value - a.value);
    const places: Record<string, number> = {};
    ordered.forEach((entry, index) => {
      const previous = ordered[index - 1];
      places[entry.key] =
        previous !== undefined && previous.value === entry.value
          ? places[previous.key]
          : index + 1;
    });
    ranked[name] = { places, measured: ordered.length };
  }
  return ranked;
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

/** The rule that emptied the board, as the results line needs it. */
interface EmptiedBy {
  /** The rule's own words, from ruleLabel. */
  label: string;
  cutModels: number;
}

// The plural is given, never derived: "match" plus an s is "matchs".
const counted = (count: number, singular: string, plural: string): string =>
  `${count.toLocaleString("en-US")} ${count === 1 ? singular : plural}`;

/** What the results region is currently showing the rows of. */
interface ResultsContext {
  /** The rule that cut the most, when the rules left nothing standing. */
  emptiedBy: EmptiedBy | null;
  /** True while a search narrows the rows to the ones matching a query. */
  searching: boolean;
}

/**
 * What the results region says about itself: how many rows it holds, how many of
 * them rank nowhere, and, when it holds none, why. An empty result under a search
 * is the search's doing, not the rules', and must not blame a rule for it.
 */
const resultsSummary = (rows: ScoredRow[], { emptiedBy, searching }: ResultsContext): string => {
  if (rows.length === 0) {
    if (searching) return "No match among the models that pass your rules.";
    return emptiedBy === null
      ? "No models pass your rules."
      : `No models pass your rules. ${emptiedBy.label} cut the most, ${counted(emptiedBy.cutModels, "model", "models")}.`;
  }
  const unrated = rows.filter(({ score }) => score.kind === "unrated").length;
  const held = searching
    ? counted(rows.length, "match", "matches")
    : counted(rows.length, "model", "models");
  return unrated === 0 ? held : `${held}, ${unrated.toLocaleString("en-US")} unrated`;
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
      ratings: identity.ratings,
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
  sentenceLabel,
  orderClause,
  decisionSentence,
  deltaNote,
  topKeys,
  topRows,
  catalogReceipt,
  fillPercent,
  sharedScale,
  metricRanks,
  resultsSummary,
  scoreBoard,
};
export type { BoardAction, DeltaNote, ScorableIdentity, Metric, ScoreCell, ScoredRow, ScoreBoard, EmptiedBy, ResultsContext };
