// Sort comparators over model identities: one axis per factory, unknown never ranks.

import type { ModelIdentity } from "../catalog/groupByModel";

type SortDirection = "asc" | "desc";
type IdentityComparator = (a: ModelIdentity, b: ModelIdentity) => number;

/** Unknown never ranks: the missing-last branch never inverts, only the known comparison flips. */
const lastIfMissing = (
  value: (identity: ModelIdentity) => number | undefined,
  ascending: boolean,
): IdentityComparator => {
  return (a, b) => {
    const av = value(a);
    const bv = value(b);
    if (av === undefined && bv === undefined) return 0;
    if (av === undefined) return 1;
    if (bv === undefined) return -1;
    return ascending ? av - bv : bv - av;
  };
};

const sortByCost = (direction: SortDirection = "asc"): IdentityComparator =>
  lastIfMissing((identity) => identity.representative.cost?.input, direction === "asc");

const sortByOutputCost = (direction: SortDirection = "asc"): IdentityComparator =>
  lastIfMissing((identity) => identity.representative.cost?.output, direction === "asc");

/** The catalog uses 0 for an unpublished limit, so 0 is unknown, not small. */
const knownLimit = (limit: number): number | undefined => (limit > 0 ? limit : undefined);

const sortByContext = (direction: SortDirection = "desc"): IdentityComparator =>
  lastIfMissing((identity) => knownLimit(identity.representative.limit.context), direction === "asc");

const sortByOutput = (direction: SortDirection = "desc"): IdentityComparator =>
  lastIfMissing((identity) => knownLimit(identity.representative.limit.output), direction === "asc");

/** An absent or unparseable date is unknown; the catalog is a document, never guessed at. */
const knownTime = (date: string | undefined): number | undefined => {
  if (!date) return undefined;
  const time = Date.parse(date);
  return Number.isNaN(time) ? undefined : time;
};

const sortByRecency = (direction: SortDirection = "desc"): IdentityComparator =>
  lastIfMissing((identity) => knownTime(identity.representative.releaseDate), direction === "asc");

const sortByKnowledgeCutoff = (direction: SortDirection = "desc"): IdentityComparator =>
  lastIfMissing((identity) => knownTime(identity.representative.knowledge), direction === "asc");

const sortByProvider = (direction: SortDirection = "asc"): IdentityComparator => {
  return (a, b) => {
    if (a.maker === null && b.maker === null) return 0;
    if (a.maker === null) return 1;
    if (b.maker === null) return -1;
    const known = a.maker.localeCompare(b.maker);
    return direction === "asc" ? known : -known;
  };
};

const sortByOpenWeights = (direction: SortDirection = "desc"): IdentityComparator =>
  lastIfMissing((identity) => {
    const open = identity.representative.openWeights;
    return open === undefined ? undefined : open ? 1 : 0;
  }, direction === "asc");

const sortByMetric = (name: string, direction: SortDirection = "desc"): IdentityComparator =>
  lastIfMissing((identity) => identity.metrics?.[name], direction === "asc");

export {
  sortByCost,
  sortByOutputCost,
  sortByContext,
  sortByOutput,
  sortByRecency,
  sortByKnowledgeCutoff,
  sortByProvider,
  sortByOpenWeights,
  sortByMetric,
};
export type { SortDirection, IdentityComparator };
