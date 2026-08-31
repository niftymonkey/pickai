// The listing that speaks for a model when one must stand for the group.

import type { Model } from "../types";
import { DIRECT_PROVIDERS } from "../identity/providers";

const DIRECT = new Set<string>(DIRECT_PROVIDERS);

const cheapestKnown = (pool: Model[]): Model | undefined => {
  let cheapest: Model | undefined;
  for (const candidate of pool) {
    const rate = candidate.cost?.input;
    if (rate === undefined || rate <= 0) continue;
    if (cheapest?.cost === undefined || rate < cheapest.cost.input) cheapest = candidate;
  }
  return cheapest;
};

const electRepresentative = (listings: Model[], maker: string | null): Model => {
  if (listings.length === 0) {
    throw new Error("electRepresentative called with no listings");
  }
  const makersOwn = listings.find((candidate) => candidate.provider === maker);
  if (makersOwn) {
    return makersOwn;
  }
  const direct = listings.filter((candidate) => DIRECT.has(candidate.provider));
  const pool = direct.length > 0 ? direct : listings;
  return cheapestKnown(pool) ?? pool[0];
};

export { electRepresentative };
