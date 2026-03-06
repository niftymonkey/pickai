import type { Model } from "./types";
import { formatPricing, formatContextWindow, formatProviderName } from "./format";

export type LabeledModel = Model & {
  providerName: string;
  priceLabel: string;
  contextLabel: string;
};

export function withDisplayLabels<T extends Model>(model: T): T & LabeledModel {
  return {
    ...model,
    providerName: formatProviderName(model.provider),
    priceLabel: model.pricing ? formatPricing(model.pricing) : "",
    contextLabel: model.contextWindow ? formatContextWindow(model.contextWindow) : "",
  };
}
