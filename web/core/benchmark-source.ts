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
 * The memory lives for the life of the process, so a cold start that fails has
 * nothing to serve and reports the failure instead.
 */
const servingLastGood = (
  fetchSet: () => Promise<BenchmarkSet>,
  reportFailure: (failure: FailedLoad) => void,
): SourceLoader => {
  let lastGood: BenchmarkSet | null = null;
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
