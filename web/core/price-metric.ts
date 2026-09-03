// Price as something the blend can weigh, not only as a fence the rail applies.
// A fence and a weight are different promises: "never above $1" against "cheaper
// is better, all else equal", and v1 and v2 both carried the second one.

import type { BenchmarkSet, MetricRating } from "pickai";
import { metricList } from "./score-view";
import type { Metric, ScorableIdentity } from "./score-view";

/** The blendable metric that is not measured by any benchmark source. */
const PRICE_METRIC: Metric = { name: "price", label: "Price" };

/**
 * What a model costs, as one number: the published rate for a million input
 * tokens plus the rate for a million output tokens. Null when the catalog
 * publishes no price, which must never become a zero (north star rule 1).
 */
const priceOf = (cost: { input: number; output: number } | undefined): number | null =>
  cost === undefined ? null : cost.input + cost.output;

/**
 * The metrics the blend can weigh: the source's own, then price. Price sorts last,
 * so `defaultWeights` starts it at zero and weighing cost stays a deliberate act.
 */
const blendMetrics = (set: BenchmarkSet | null): Metric[] => [...metricList(set), PRICE_METRIC];

// Published rates run from fractions of a cent to $750 per million tokens, five
// orders of magnitude, so a linear scale would pack almost every model against
// the cheap end and say nothing. Log spreads them.
const spread = (price: number): number => Math.log1p(price);

/**
 * Cheapness on the score's own scale, so the weighted average stays arithmetic
 * rather than a mixing of units: the cheapest model in the list sits where the
 * best measured score sits, and the dearest where the worst one does.
 *
 * The scale is the surviving list's, not the catalog's, because the promise is
 * "cheaper than the rest of what passed your rules".
 */
const cheapnessValue = (
  price: number,
  prices: { cheapest: number; dearest: number },
  scale: { min: number; max: number },
): number => {
  const low = spread(prices.cheapest);
  const high = spread(prices.dearest);
  if (high - low <= 0) return scale.max;
  const dearness = (spread(price) - low) / (high - low);
  return scale.max - dearness * (scale.max - scale.min);
};

const syntheticRating = (key: string, value: number): MetricRating => ({
  best: value,
  bestConfig: key,
  // A published rate is exact: there is no interval to report and no vote behind it.
  low: value,
  high: value,
  min: value,
  max: value,
  configs: 1,
});

/**
 * Every identity, with a `price` rating added wherever the source measured the
 * model and the catalog publishes a price.
 *
 * **Price only weighs models the source measured.** Cheapness is not a quality
 * signal on its own: giving an unmeasured model a price rating would let it blend
 * to a full score and outrank measured models. Proved in the browser, where a
 * price weight put a wall of $0 routing entries above every rated model. Absent
 * data ranks nowhere, so an unrated model stays in the unrated bucket.
 *
 * A measured model with no published price gets no rating either, and reads as
 * uncovered exactly as a missing benchmark category does.
 *
 * Returns the identities untouched when nothing is rated: with no score scale
 * there is nothing to map cheapness onto.
 */
const withPriceRatings = (
  identities: ScorableIdentity[],
  scale: { min: number; max: number } | null,
): ScorableIdentity[] => {
  if (scale === null) return identities;
  const measured = identities.filter(({ ratings }) => ratings !== undefined);
  const prices = measured
    .map(({ representative }) => priceOf(representative.cost))
    .filter((price): price is number => price !== null);
  if (prices.length === 0) return identities;
  const bounds = { cheapest: Math.min(...prices), dearest: Math.max(...prices) };

  return identities.map((identity) => {
    if (identity.ratings === undefined) return identity;
    const price = priceOf(identity.representative.cost);
    if (price === null) return identity;
    return {
      ...identity,
      ratings: {
        ...identity.ratings,
        [PRICE_METRIC.name]: syntheticRating(
          identity.key,
          cheapnessValue(price, bounds, scale),
        ),
      },
    };
  });
};

export { PRICE_METRIC, blendMetrics, priceOf, withPriceRatings };
