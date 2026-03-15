/**
 * Sort comparators for use with find().
 *
 * Each function returns a comparator that can be passed to the `sort`
 * option. Pass "asc" for ascending or "desc" for descending.
 */

import type { Model } from "./types";

type SortDirection = "asc" | "desc";
type ModelComparator = (a: Model, b: Model) => number;

/**
 * Sort by input cost per 1M tokens.
 * Models without pricing sort last regardless of direction.
 */
export function sortByCost(direction: SortDirection = "asc"): ModelComparator {
  return (a, b) => {
    if (a.cost?.input == null && b.cost?.input == null) return 0;
    if (a.cost?.input == null) return 1;
    if (b.cost?.input == null) return -1;
    const diff = a.cost.input - b.cost.input;
    return direction === "asc" ? diff : -diff;
  };
}

/**
 * Sort by release date.
 * Models without a release date sort last regardless of direction.
 */
export function sortByRecency(direction: SortDirection = "desc"): ModelComparator {
  return (a, b) => {
    const aTime = safeTime(a.releaseDate);
    const bTime = safeTime(b.releaseDate);
    if (aTime === 0 && bTime === 0) return 0;
    if (aTime === 0) return 1;
    if (bTime === 0) return -1;
    const diff = aTime - bTime;
    return direction === "desc" ? -diff : diff;
  };
}

/**
 * Sort by context window size.
 */
export function sortByContext(direction: SortDirection = "desc"): ModelComparator {
  return (a, b) => {
    const diff = a.limit.context - b.limit.context;
    return direction === "desc" ? -diff : diff;
  };
}

/**
 * Sort by output token limit.
 */
export function sortByOutput(direction: SortDirection = "desc"): ModelComparator {
  return (a, b) => {
    const diff = a.limit.output - b.limit.output;
    return direction === "desc" ? -diff : diff;
  };
}

function safeTime(date?: string): number {
  if (!date) return 0;
  const ts = new Date(date).getTime();
  return Number.isNaN(ts) ? 0 : ts;
}
