import { expect, test } from "vitest";
import type { Model, ModelIdentity } from "pickai";
import { PRICE_METRIC, blendMetrics, priceOf, withPriceRatings } from "../price-metric";
import type { ScorableIdentity } from "../score-view";

const listing = (id: string, cost: { input: number; output: number } | undefined): Model => ({
  id,
  name: id,
  provider: "maker",
  ...(cost !== undefined && { cost }),
  limit: { context: 128_000, output: 16_384 },
  modalities: { input: ["text"], output: ["text"] },
  openRouterId: `maker/${id}`,
});

const priced = (id: string, cost: { input: number; output: number } | undefined): ModelIdentity => {
  const representative = listing(id, cost);
  return { key: id, maker: "maker", representative, listings: [representative] };
};

const rating = (value: number, key: string) => ({
  best: value,
  bestConfig: key,
  low: value,
  high: value,
  min: value,
  max: value,
  configs: 1,
});

// Price weighs only what the source measured, so a fixture needs a measured score
// before it can carry a price rating at all.
const measured = (
  id: string,
  cost: { input: number; output: number } | undefined,
): ScorableIdentity => ({ ...priced(id, cost), ratings: { overall: rating(1400, id) } });

const scale = { min: 1000, max: 1500 };
const priceOfKey = (rated: ScorableIdentity[], key: string): number | undefined =>
  rated.find((identity) => identity.key === key)?.ratings?.[PRICE_METRIC.name]?.best;

test("a published price is the input rate plus the output rate", () => {
  expect(priceOf({ input: 2.5, output: 10 })).toBe(12.5);
});

test("no published price is no number at all", () => {
  // Rule 1: a model with no price is not free, and must never become a zero.
  expect(priceOf(undefined)).toBeNull();
});

test("the cheapest model sits where the best score sits and the dearest where the worst does", () => {
  const rated = withPriceRatings(
    [measured("cheap", { input: 0.1, output: 0.1 }), measured("dear", { input: 100, output: 100 })],
    scale,
  );
  expect(priceOfKey(rated, "cheap")).toBe(scale.max);
  expect(priceOfKey(rated, "dear")).toBe(scale.min);
});

test("a stated zero price is the cheapest, not the unknown", () => {
  // 13% of the catalog publishes $0 on both sides. A stated zero is a fact; only
  // an absent price is unknown.
  const rated = withPriceRatings(
    [measured("free", { input: 0, output: 0 }), measured("dear", { input: 100, output: 100 })],
    scale,
  );
  expect(priceOfKey(rated, "free")).toBe(scale.max);
});

test("a model with no published price gets no price rating", () => {
  const rated = withPriceRatings(
    [measured("silent", undefined), measured("dear", { input: 100, output: 100 })],
    scale,
  );
  expect(priceOfKey(rated, "silent")).toBeUndefined();
});

test("prices spread on a log scale, so the crowd of cheap models separates", () => {
  // Rates run from fractions of a cent to $750. Linearly, a $1 model against a $750
  // dearest lands at 98.8% of the scale and a $10 model at 98.8% too: the whole cheap
  // crowd stacks on one pixel. This pins the separation a log scale buys.
  const rated = withPriceRatings(
    [
      measured("a", { input: 0.5, output: 0.5 }),
      measured("b", { input: 5, output: 5 }),
      measured("c", { input: 375, output: 375 }),
    ],
    scale,
  );
  const span = scale.max - scale.min;
  const gap = priceOfKey(rated, "a")! - priceOfKey(rated, "b")!;
  expect(gap).toBeGreaterThan(span * 0.1);
});

test("one price in the whole list sits at the top", () => {
  const rated = withPriceRatings([measured("only", { input: 3, output: 3 })], scale);
  expect(priceOfKey(rated, "only")).toBe(scale.max);
});

test("a model the source never measured gets no price rating", () => {
  // Cheapness is not a quality signal on its own. Without this, a $0 routing entry
  // nobody has measured blends to a full score and outranks every rated model.
  const rated = withPriceRatings(
    [priced("unmeasured", { input: 0, output: 0 }), measured("dear", { input: 100, output: 100 })],
    scale,
  );
  expect(priceOfKey(rated, "unmeasured")).toBeUndefined();
  expect(rated.find((identity) => identity.key === "unmeasured")?.ratings).toBeUndefined();
});

test("identities pass through untouched when nothing is rated", () => {
  // With no score scale there is nothing to map cheapness onto.
  const identities = [priced("a", { input: 1, output: 1 })];
  expect(withPriceRatings(identities, null)).toBe(identities);
});

test("a model's own measured ratings survive the price rating being added", () => {
  const identity: ScorableIdentity = {
    ...priced("a", { input: 1, output: 1 }),
    ratings: {
      overall: { best: 1400, bestConfig: "a", low: 1400, high: 1400, min: 1400, max: 1400, configs: 1 },
    },
  };
  const [rated] = withPriceRatings([identity], scale);
  expect(rated.ratings?.overall.best).toBe(1400);
  expect(rated.ratings?.price).toBeDefined();
});

test("price is the last blendable metric, so it starts at no weight", () => {
  const metrics = blendMetrics({
    source: "LMArena",
    measuredAt: "2026-09-01",
    scores: [{ modelId: "a", metrics: { overall: { value: 1400, low: 1400, high: 1400 } } }],
  });
  expect(metrics[metrics.length - 1]).toEqual(PRICE_METRIC);
});

test("price is blendable even before a source has been chosen", () => {
  expect(blendMetrics(null)).toEqual([PRICE_METRIC]);
});
