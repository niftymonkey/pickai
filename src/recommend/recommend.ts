// The paved road (9.32): group, join, rule, order, constrain, with every miss visible.

import type { Model } from "../types";
import type { ModelIdentity } from "../catalog/groupByModel";
import { groupByModel } from "../catalog/groupByModel";
import type { FilterStep } from "../filter/applyRules";
import { applyRules } from "../filter/applyRules";
import type { Rule } from "../filter/rule";
import type { BenchmarkScore, BenchmarkSet } from "../benchmarks/benchmarkSet";
import type { RatedIdentity } from "../benchmarks/joinBenchmarks";
import { joinBenchmarks } from "../benchmarks/joinBenchmarks";
import type { BlendedRating } from "../benchmarks/blendRatings";
import { blendRatings } from "../benchmarks/blendRatings";
import type { IdentityComparator } from "../order/comparators";
import type { ModelConstraint } from "./constraints";
import type { ModelFilter } from "./modelFilter";
import { toRules } from "./modelFilter";

/** Weights over metric names, blind to what the names are (finding 13). */
type MetricWeights = Record<string, number>;

interface RecommendOptions {
  /** Declarative filter (compiled to rules) or prebuilt rules, used verbatim. */
  filter?: ModelFilter | Rule[];
  /** The ordering: a comparator over facts, or weights over named metrics. */
  order: IdentityComparator | MetricWeights;
  /** Shortlist diversity constraints. */
  constraints?: ModelConstraint[];
  /** Shortlist size (default: 5). */
  limit?: number;
}

interface RecommendWithBenchmarks extends RecommendOptions {
  /** Scores to join onto the catalog; required for a weights ordering. */
  benchmarks: BenchmarkSet;
}

/** The implementation's view: benchmarks may or may not be present. */
interface RecommendInput extends RecommendOptions {
  benchmarks?: BenchmarkSet;
}

/** One shortlist entry: the model, and how a weights ordering judged it (9.31). */
interface RankedModel<T extends ModelIdentity = ModelIdentity> {
  model: T;
  blend?: BlendedRating;
}

interface Recommendation<T extends ModelIdentity = ModelIdentity> {
  /** The ordered shortlist. */
  picks: RankedModel<T>[];
  /** Weights ordering only: filtered survivors with none of the wanted metrics. */
  unrated: ModelIdentity[];
  /** Per-rule counts in both units, in the order the rules ran. */
  steps: FilterStep[];
  /** Benchmark rows that joined no catalog model. */
  unmatched: BenchmarkScore[];
}

/** v2's two-pass shape: respect constraints first, then fill the shortfall ignoring them. */
const selectPicks = (
  ordered: RankedModel[],
  constraints: ModelConstraint[],
  limit: number,
): RankedModel[] => {
  const picks: RankedModel[] = [];
  const models: ModelIdentity[] = [];
  const taken = new Set<number>();
  for (let index = 0; index < ordered.length && picks.length < limit; index++) {
    const candidate = ordered[index];
    if (constraints.every((allows) => allows(models, candidate.model))) {
      picks.push(candidate);
      models.push(candidate.model);
      taken.add(index);
    }
  }
  for (let index = 0; index < ordered.length && picks.length < limit; index++) {
    if (!taken.has(index)) picks.push(ordered[index]);
  }
  return picks;
};

function recommend(catalog: Model[], options: RecommendWithBenchmarks): Recommendation<RatedIdentity>;
function recommend(catalog: Model[], options: RecommendOptions): Recommendation;
function recommend(catalog: Model[], options: RecommendInput): Recommendation {
  const { order, constraints = [], limit = 5, benchmarks } = options;
  if (typeof order !== "function" && benchmarks === undefined) {
    throw new Error(
      "recommend(): a weights ordering needs a benchmarks set; pass benchmarks or order by a comparator",
    );
  }

  const grouped = groupByModel(catalog);
  let identities: (ModelIdentity | RatedIdentity)[] = grouped;
  let unmatched: BenchmarkScore[] = [];
  if (benchmarks !== undefined) {
    const join = joinBenchmarks(grouped, benchmarks);
    // An unjoined model carries empty ratings: measured nothing, absent stays absent.
    const unscored = join.unscored.map((model) => ({ ...model, ratings: {}, metrics: {} }));
    identities = [...join.joined, ...unscored];
    unmatched = join.unmatched;
  }

  // The join runs first so metric rules can judge measured values (9.34).
  const { survivors, steps } = applyRules(identities, toRules(options.filter ?? {}));

  if (typeof order === "function") {
    const ordered = [...survivors].sort(order).map((model) => ({ model }));
    return { picks: selectPicks(ordered, constraints, limit), unrated: [], steps, unmatched };
  }

  const rated: RankedModel[] = [];
  const unrated: ModelIdentity[] = [];
  for (const model of survivors) {
    const blend = blendRatings("ratings" in model ? model.ratings : undefined, order);
    if (blend.kind === "unrated") unrated.push(model);
    else rated.push({ model, blend });
  }
  const best = (pick: RankedModel): number =>
    pick.blend?.kind === "single" || pick.blend?.kind === "blend" ? pick.blend.rating.best : 0;
  rated.sort((a, b) => best(b) - best(a));
  return { picks: selectPicks(rated, constraints, limit), unrated, steps, unmatched };
}

export { recommend };
export type { MetricWeights, RecommendOptions, RecommendWithBenchmarks, RankedModel, Recommendation };
