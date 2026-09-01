// Whether two ids name the same model.

import { normalizeModelId } from "./normalizeModelId";

const matchesModel = (a: string, b: string): boolean =>
  normalizeModelId(a) === normalizeModelId(b);

export { matchesModel };
