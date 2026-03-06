/**
 * Enrich models with pre-computed display fields.
 *
 * Decorates each Model with tier classification, cost tier, and
 * formatted strings — designed for .map():
 *
 *   const models = raw.map(enrich);
 *
 * Convenience wrapper over withClassification() + withDisplayLabels().
 */

import type { Model } from "./types";
import { withClassification, type ClassifiedModel } from "./with-classification";
import { withDisplayLabels, type LabeledModel } from "./with-display-labels";

/**
 * A Model decorated with pre-computed classification and display fields.
 */
export type EnrichedModel = ClassifiedModel & LabeledModel;

/**
 * Enrich a model with classification and formatted display fields.
 *
 * Designed for use with .map():
 * ```typescript
 * const models = parseOpenRouterCatalog(data).map(enrich);
 * ```
 */
export function enrich(model: Model): EnrichedModel {
  return withDisplayLabels(withClassification(model));
}
