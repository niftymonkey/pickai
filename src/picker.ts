/**
 * The picker: createPicker() → { find, recommend }
 *
 * Thin wrapper that calls the source once, then provides find() and recommend()
 * bound to the loaded model data.
 */

import type { Model, Picker, FindOptions, PurposeProfile, RecommendOptions, ScoredModel } from "./types";
import { find as findModels } from "./find";
import { recommend as recommendModels } from "./recommend";

/**
 * Create a picker from a model source.
 *
 * The source is called once at creation time. Subsequent find() and recommend()
 * calls reuse the loaded data.
 *
 * @example
 * ```ts
 * const pick = await createPicker(modelsDev())
 * const cheap = pick.find({ sort: "costAsc", limit: 10 })
 * const best = pick.recommend(Purpose.Coding, { limit: 5 })
 * ```
 */
export async function createPicker(source: () => Promise<Model[]>): Promise<Picker> {
  const models = await source();

  return {
    find(options?: FindOptions): Model[] {
      return findModels(models, options);
    },
    recommend(profile: PurposeProfile, options?: RecommendOptions): ScoredModel[] {
      return recommendModels(models, profile, options);
    },
  };
}
