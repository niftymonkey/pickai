// Shortlist diversity constraints over model identities.

import type { ModelIdentity } from "../catalog/groupByModel";

/** True when the candidate may join the already-selected shortlist. */
type ModelConstraint = (selected: ModelIdentity[], candidate: ModelIdentity) => boolean;

/** At most `max` picks per maker; an unknown maker is never counted (finding 14's absent rule). */
const perMaker = (max = 1): ModelConstraint => {
  return (selected, candidate) => {
    if (candidate.maker === null) return true;
    const held = selected.filter((model) => model.maker === candidate.maker).length;
    return held < max;
  };
};

/** At most `max` picks per family; a model without a family is never counted (as v2 ruled). */
const perFamily = (max = 1): ModelConstraint => {
  return (selected, candidate) => {
    const family = candidate.representative.family;
    if (family === undefined) return true;
    const held = selected.filter((model) => model.representative.family === family).length;
    return held < max;
  };
};

export { perMaker, perFamily };
export type { ModelConstraint };
