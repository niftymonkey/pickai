/**
 * Model finding: filter, sort, and limit.
 *
 * find() is the "what should I consider?" path. No scoring, just metadata.
 */

import type { Model, FindOptions } from "./types";
import { applyFilter } from "./filter";
import { sortByRecency } from "./sort";

/** Default sort: newest release date first. */
const defaultSort = sortByRecency("desc");

/**
 * Find models matching the given options.
 *
 * Default sort: recency (newest releaseDate first).
 * Use sortByCost, sortByContext, sortByOutput, or a custom comparator.
 */
export function find(models: Model[], options: FindOptions = {}): Model[] {
  const { filter, sort = defaultSort, limit } = options;

  let result = applyFilter(models, filter);

  result = [...result].sort(sort);

  if (limit != null) {
    result = result.slice(0, limit);
  }

  return result;
}
