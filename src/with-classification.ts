import type { Model, ModelTier, CostTier } from "./types";
import { classifyTier, classifyCostTier } from "./classify";

export type ClassifiedModel = Model & {
  tier: ModelTier;
  costTier: CostTier;
};

export function withClassification<T extends Model>(model: T): T & ClassifiedModel {
  return {
    ...model,
    tier: classifyTier(model),
    costTier: classifyCostTier(model),
  };
}
