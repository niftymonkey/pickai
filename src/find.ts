/**
 * Model discovery: filter, sort, and limit.
 *
 * find() is the "what should I consider?" path — no scoring, just metadata.
 */

import type { Model, FindOptions } from "./types";
import { applyFilter } from "./filter";

/**
 * Find models matching the given options.
 *
 * Default sort: recency (newest releaseDate first).
 * Supports "costAsc" preset or a custom comparator.
 */
export function find(models: Model[], options: FindOptions = {}): Model[] {
  const { filter, sort, limit } = options;

  let result = applyFilter(models, filter);

  // Sort
  if (typeof sort === "function") {
    result = [...result].sort(sort);
  } else if (sort === "costAsc") {
    result = [...result].sort((a, b) => (a.cost?.input ?? 0) - (b.cost?.input ?? 0));
  } else {
    // Default: recency descending (newest first)
    result = [...result].sort((a, b) => {
      const aDate = a.releaseDate ? new Date(a.releaseDate).getTime() : 0;
      const bDate = b.releaseDate ? new Date(b.releaseDate).getTime() : 0;
      const aTime = Number.isNaN(aDate) ? 0 : aDate;
      const bTime = Number.isNaN(bDate) ? 0 : bDate;
      return bTime - aTime;
    });
  }

  // Limit
  if (limit != null) {
    result = result.slice(0, limit);
  }

  return result;
}
