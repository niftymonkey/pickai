// Listings folded into model identities: one identity per model, every seller kept.

import type { Model } from "../types";
import { normalizeModelId } from "../identity/normalizeModelId";
import { modelMaker } from "../identity/modelMaker";
import { electRepresentative } from "./electRepresentative";

interface ModelIdentity {
  /** The normalized id every listing of this model shares. */
  key: string;
  /** Who built the model. Null when unknown. */
  maker: string | null;
  /** The elected listing that speaks for the model. */
  representative: Model;
  /** Every seller listing, none dropped. */
  listings: Model[];
}

const groupByModel = (listings: Model[]): ModelIdentity[] => {
  const byKey = new Map<string, Model[]>();
  for (const entry of listings) {
    const key = normalizeModelId(entry.id);
    const bucket = byKey.get(key);
    if (bucket) bucket.push(entry);
    else byKey.set(key, [entry]);
  }
  return [...byKey.entries()].map(([key, grouped]) => {
    const maker = modelMaker(key);
    return {
      key,
      maker,
      representative: electRepresentative(grouped, maker),
      listings: grouped,
    };
  });
};

export { groupByModel };
export type { ModelIdentity };
