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
  /** Measured values by metric name. A benchmark join writes it; grouping never does. */
  metrics?: Record<string, number>;
}

// Names are compared loosely because the catalog writes one model's name as
// "GLM-5.2", "GLM 5.2" and "Glm 5.2", and all three mean the same model.
const looseName = (name: string): string => name.toLowerCase().replace(/[^a-z0-9]+/g, "");

const identitiesByNormalizedId = (listings: Model[]): ModelIdentity[] => {
  const byKey = new Map<string, Model[]>();
  for (const entry of listings) {
    const key = normalizeModelId(entry.id);
    const bucket = byKey.get(key);
    if (bucket) bucket.push(entry);
    else byKey.set(key, [entry]);
  }
  return [...byKey.entries()].map(([key, grouped]) => {
    const maker = modelMaker(key);
    return { key, maker, representative: electRepresentative(grouped, maker), listings: grouped };
  });
};

// The surviving key is the shortest of the merged keys, ties broken
// alphabetically, so the same catalog always names the model the same way
// however its listings happen to be ordered.
/**
 * The surviving key is the id the most sellers publish, because a benchmark join
 * matches on it: the shortest id is often a typo variant, and keying by it cost
 * 19 models their measured score against the live LMArena set. Ties fall to the
 * shortest, then alphabetically, so the answer never depends on catalog order.
 */
const busiestKey = (merged: ModelIdentity[]): string =>
  [...merged].sort(
    (left, right) =>
      right.listings.length - left.listings.length ||
      left.key.length - right.key.length ||
      (left.key < right.key ? -1 : 1),
  )[0].key;

const mergeIntoOneIdentity = (merged: ModelIdentity[]): ModelIdentity => {
  if (merged.length === 1) return merged[0];
  const listings = merged.flatMap((identity) => identity.listings);
  const maker = merged[0].maker;
  return {
    key: busiestKey(merged),
    maker,
    representative: electRepresentative(listings, maker),
    listings,
  };
};

// Same display name plus same maker means the same model: when models.dev gives
// two ids one name and one maker, the source is saying they are one model, and
// that is trusted over what the id strings look like. Quantizations, parameter
// counts, date snapshots and reseller prefixes fold in as further listings, and
// their prices surface as the model's price spread.
const foldByNameAndMaker = (identities: ModelIdentity[]): ModelIdentity[] => {
  const byNameAndMaker = new Map<string, ModelIdentity[]>();
  for (const identity of identities) {
    const key = `${looseName(identity.representative.name)}|${identity.maker ?? ""}`;
    const merged = byNameAndMaker.get(key);
    if (merged) merged.push(identity);
    else byNameAndMaker.set(key, [identity]);
  }
  return [...byNameAndMaker.values()].map(mergeIntoOneIdentity);
};

const groupByModel = (listings: Model[]): ModelIdentity[] =>
  foldByNameAndMaker(identitiesByNormalizedId(listings));

export { groupByModel };
export type { ModelIdentity };
