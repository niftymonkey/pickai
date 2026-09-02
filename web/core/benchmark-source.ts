// A server-loaded benchmark set: the live fetch, and the last-good set that stands in when it fails.

import type { BenchmarkSet } from "pickai";

/** What a server-side benchmark load hands the page. */
type BenchmarkSource =
  | { status: "ok"; set: BenchmarkSet }
  | { status: "stale"; set: BenchmarkSet; reason: string }
  | { status: "unavailable"; reason: string };

type SourceLoader = () => Promise<BenchmarkSource>;

/** A load that failed, told apart by whether a last-good set stood in for it. */
type FailedLoad = Exclude<BenchmarkSource, { status: "ok" }>;

/**
 * Wraps a live fetch so a failed load serves the last set that succeeded.
 * The memory lives for the life of the process, so a cold start has none of its
 * own: the floor is what it serves instead. Without a floor, a cold start whose
 * fetch fails has nothing to stand in and reports the failure. A build worker is
 * cold by definition, which is how a whole deployment once shipped scoreless.
 */
const servingLastGood = (
  fetchSet: () => Promise<BenchmarkSet>,
  reportFailure: (failure: FailedLoad) => void,
  floor: BenchmarkSet | null = null,
): SourceLoader => {
  let lastGood: BenchmarkSet | null = floor;
  return async () => {
    try {
      const set = await fetchSet();
      lastGood = set;
      return { status: "ok", set };
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      const failure: FailedLoad =
        lastGood === null
          ? { status: "unavailable", reason }
          : { status: "stale", set: lastGood, reason };
      reportFailure(failure);
      return failure;
    }
  };
};

export { servingLastGood };
export type { BenchmarkSource, FailedLoad, SourceLoader };
