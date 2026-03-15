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
  ModelFilter,
  PurposeProfile,
  ScoringCriterion,
  WeightedCriterion,
  Constraint,
  FindOptions,
  RecommendOptions,
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

describe("ModelFilter", () => {
  it("all fields are optional", () => {
    expectTypeOf<{}>().toMatchTypeOf<ModelFilter>();
  });

  it("has capability boolean filters", () => {
    expectTypeOf<ModelFilter>().toHaveProperty("reasoning").toEqualTypeOf<boolean | undefined>();
    expectTypeOf<ModelFilter>().toHaveProperty("toolCall").toEqualTypeOf<boolean | undefined>();
    expectTypeOf<ModelFilter>().toHaveProperty("structuredOutput").toEqualTypeOf<boolean | undefined>();
  });

  it("has cost bounds", () => {
    expectTypeOf<ModelFilter>().toHaveProperty("maxCostInput").toEqualTypeOf<number | undefined>();
    expectTypeOf<ModelFilter>().toHaveProperty("maxCostOutput").toEqualTypeOf<number | undefined>();
  });

  it("has provider filters", () => {
    expectTypeOf<ModelFilter>().toHaveProperty("providers").toEqualTypeOf<string[] | undefined>();
    expectTypeOf<ModelFilter>().toHaveProperty("excludeProviders").toEqualTypeOf<string[] | undefined>();
  });
});

describe("PurposeProfile", () => {
  it("has required criteria and optional filter", () => {
    expectTypeOf<PurposeProfile>().toHaveProperty("criteria").toEqualTypeOf<WeightedCriterion[]>();
    expectTypeOf<PurposeProfile>().toHaveProperty("filter").toEqualTypeOf<ModelFilter | undefined>();
  });

  it("does not have preferredTier (v1 removed)", () => {
    expectTypeOf<PurposeProfile>().not.toHaveProperty("preferredTier");
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
  it("is a function (model, allModels) => number", () => {
    expectTypeOf<ScoringCriterion>().toBeFunction();
    expectTypeOf<ScoringCriterion>().parameters.toEqualTypeOf<[Model, Model[]]>();
    expectTypeOf<ScoringCriterion>().returns.toBeNumber();
  });
});

describe("Constraint", () => {
  it("is a function (selected, candidate) => boolean", () => {
    expectTypeOf<Constraint>().toBeFunction();
    expectTypeOf<Constraint>().parameters.toEqualTypeOf<[Model[], Model]>();
    expectTypeOf<Constraint>().returns.toBeBoolean();
  });
});

describe("FindOptions", () => {
  it("accepts declarative filter or predicate", () => {
    expectTypeOf<FindOptions>().toHaveProperty("filter").toEqualTypeOf<
      ModelFilter | ((model: Model) => boolean) | undefined
    >();
  });

  it("accepts sort comparator", () => {
    expectTypeOf<FindOptions>().toHaveProperty("sort").toEqualTypeOf<
      ((a: Model, b: Model) => number) | undefined
    >();
  });
});

describe("RecommendOptions", () => {
  it("accepts filter, constraints, and limit", () => {
    expectTypeOf<RecommendOptions>().toHaveProperty("filter").toEqualTypeOf<
      ModelFilter | ((model: Model) => boolean) | undefined
    >();
    expectTypeOf<RecommendOptions>().toHaveProperty("constraints").toEqualTypeOf<
      Constraint[] | undefined
    >();
    expectTypeOf<RecommendOptions>().toHaveProperty("limit").toEqualTypeOf<number | undefined>();
  });
});
