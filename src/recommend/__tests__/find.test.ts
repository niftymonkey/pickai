import { describe, it, expect } from "vitest";
import { find } from "../find";

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
];

describe("find", () => {
  it("folds listings into model identities, so the count is models, not listings", () => {
    const { models } = find(catalog());
    expect(models.map((model) => model.key).sort()).toEqual(["alpha-9", "beta-2", "gamma-7"]);
    const alpha = models.find((model) => model.key === "alpha-9");
    expect(alpha?.listings).toHaveLength(2);
  });

  it("sorts newest release first by default", () => {
    const { models } = find(catalog());
    expect(models.map((model) => model.key)).toEqual(["beta-2", "alpha-9", "gamma-7"]);
  });

  it("accepts any identity comparator", () => {
    const byInputPrice = (a: { representative: { cost?: { input: number } } }, b: { representative: { cost?: { input: number } } }) =>
      (a.representative.cost?.input ?? Infinity) - (b.representative.cost?.input ?? Infinity);
    const { models } = find(catalog(), { sort: byInputPrice });
    expect(models.map((model) => model.key)).toEqual(["beta-2", "gamma-7", "alpha-9"]);
  });

  it("limit caps the list after sorting", () => {
    const { models } = find(catalog(), { limit: 2 });
    expect(models.map((model) => model.key)).toEqual(["beta-2", "alpha-9"]);
  });
  it("a declarative filter cuts models and reports steps in both units", () => {
    const { models, steps } = find(catalog(), {
      filter: { maxCostInput: 10, excludeDeprecated: false },
    });
    expect(models.map((model) => model.key).sort()).toEqual(["beta-2", "gamma-7"]);
    expect(steps).toHaveLength(1);
    expect(steps[0]).toMatchObject({ cut: 2, remaining: 2, cutModels: 1, remainingModels: 2 });
  });

  it("accepts prebuilt rules verbatim", () => {
    const { models, steps } = find(catalog(), {
      filter: [{ kind: "provider", mode: "exclude", providers: ["resell-mart"] }],
    });
    expect(models).toHaveLength(3);
    expect(steps[0]).toMatchObject({ cut: 1, cutModels: 0 });
  });

  it("without a filter no rule runs and deprecated models are included", () => {
    const withRelic = [...catalog(), listing("relic-1", "acme", { status: "deprecated" })];
    const { models, steps } = find(withRelic);
    expect(models.map((model) => model.key)).toContain("relic-1");
    expect(steps).toEqual([]);
  });

  it("an empty declarative filter still excludes deprecated models", () => {
    const withRelic = [...catalog(), listing("relic-1", "acme", { status: "deprecated" })];
    const { models, steps } = find(withRelic, { filter: {} });
    expect(models.map((model) => model.key)).not.toContain("relic-1");
    expect(steps[0]).toMatchObject({ rule: { kind: "excludeDeprecated" }, cutModels: 1 });
  });
});
