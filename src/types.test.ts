/**
 * Type-level tests for v2 types.
 * Uses expectTypeOf to verify shapes at compile time.
 */

import { describe, it, expectTypeOf } from "vitest";
import type {
  Model,
  ModelCost,
  ModelLimit,
  ModelModalities,
  ScoringCriterion,
  ScoredModel,
} from "./types";

describe("Model", () => {
  it("has required fields", () => {
    expectTypeOf<Model>().toHaveProperty("id").toBeString();
    expectTypeOf<Model>().toHaveProperty("name").toBeString();
    expectTypeOf<Model>().toHaveProperty("provider").toBeString();
    expectTypeOf<Model>().toHaveProperty("openRouterId").toBeString();
    expectTypeOf<Model>().toHaveProperty("limit").toEqualTypeOf<ModelLimit>();
    expectTypeOf<Model>().toHaveProperty("modalities").toEqualTypeOf<ModelModalities>();
  });

  it("has optional capability flags", () => {
    expectTypeOf<Model>().toHaveProperty("reasoning").toEqualTypeOf<boolean | undefined>();
    expectTypeOf<Model>().toHaveProperty("toolCall").toEqualTypeOf<boolean | undefined>();
    expectTypeOf<Model>().toHaveProperty("structuredOutput").toEqualTypeOf<boolean | undefined>();
    expectTypeOf<Model>().toHaveProperty("openWeights").toEqualTypeOf<boolean | undefined>();
    expectTypeOf<Model>().toHaveProperty("attachment").toEqualTypeOf<boolean | undefined>();
  });

  it("has optional metadata fields", () => {
    expectTypeOf<Model>().toHaveProperty("family").toEqualTypeOf<string | undefined>();
    expectTypeOf<Model>().toHaveProperty("knowledge").toEqualTypeOf<string | undefined>();
    expectTypeOf<Model>().toHaveProperty("releaseDate").toEqualTypeOf<string | undefined>();
    expectTypeOf<Model>().toHaveProperty("status").toEqualTypeOf<string | undefined>();
    expectTypeOf<Model>().toHaveProperty("sdk").toEqualTypeOf<string | undefined>();
    expectTypeOf<Model>().toHaveProperty("cost").toEqualTypeOf<ModelCost | undefined>();
  });
});

describe("ModelCost", () => {
  it("has required input/output and optional cache fields", () => {
    expectTypeOf<ModelCost>().toHaveProperty("input").toBeNumber();
    expectTypeOf<ModelCost>().toHaveProperty("output").toBeNumber();
    expectTypeOf<ModelCost>().toHaveProperty("cacheRead").toEqualTypeOf<number | undefined>();
    expectTypeOf<ModelCost>().toHaveProperty("cacheWrite").toEqualTypeOf<number | undefined>();
  });
});

describe("ModelLimit", () => {
  it("has required context and output", () => {
    expectTypeOf<ModelLimit>().toHaveProperty("context").toBeNumber();
    expectTypeOf<ModelLimit>().toHaveProperty("output").toBeNumber();
  });
});

describe("ScoredModel", () => {
  it("extends Model with score", () => {
    expectTypeOf<ScoredModel>().toHaveProperty("score").toBeNumber();
    expectTypeOf<ScoredModel>().toHaveProperty("id").toBeString();
    expectTypeOf<ScoredModel>().toHaveProperty("provider").toBeString();
  });

  it("preserves generic type", () => {
    interface CustomModel extends Model {
      custom: string;
    }
    expectTypeOf<ScoredModel<CustomModel>>().toHaveProperty("custom").toBeString();
    expectTypeOf<ScoredModel<CustomModel>>().toHaveProperty("score").toBeNumber();
  });
});

describe("ScoringCriterion", () => {
  it("is a function (model, allModels) => number | undefined", () => {
    expectTypeOf<ScoringCriterion>().toBeFunction();
    expectTypeOf<ScoringCriterion>().parameters.toEqualTypeOf<[Model, Model[]]>();
    expectTypeOf<ScoringCriterion>().returns.toEqualTypeOf<number | undefined>();
  });

  it("accepts a generic type parameter for enriched models", () => {
    type Enriched = Model & { arena?: number };
    expectTypeOf<ScoringCriterion<Enriched>>().toBeFunction();
    expectTypeOf<ScoringCriterion<Enriched>>().parameters.toEqualTypeOf<[Enriched, Enriched[]]>();
  });

  it("base ScoringCriterion is assignable to enriched WeightedCriterion", () => {
    type Enriched = Model & { arena?: number };
    const baseCriterion: ScoringCriterion = (_model, _all) => 0.5;
    // A criterion that takes Model should be usable where Enriched is expected,
    // since Enriched extends Model (contravariance of function parameters).
    expectTypeOf(baseCriterion).toMatchTypeOf<ScoringCriterion<Enriched>>();
  });
});
