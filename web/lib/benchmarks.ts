// The server's benchmark fetch: the LMArena leaderboard, loaded once per render pass.

import { cache } from "react";
import { fromArena } from "pickai";
import type { BenchmarkSet } from "pickai";
import { keepMetrics } from "@/core/score-view";
import ARENA_SNAPSHOT from "./arena-snapshot.json";
import { servingLastGood } from "@/core/benchmark-source";
import type { BenchmarkSource } from "@/core/benchmark-source";

// The six blendable categories this surface offers; the split also publishes
// language, industry, and control cuts that are not blend material.
const ARENA_METRICS = [
  "overall",
  "coding",
  "math",
  "hard_prompts",
  "creative_writing",
  "instruction_following",
];

const fetchArena = async (): Promise<BenchmarkSet> =>
  keepMetrics(await fromArena(), ARENA_METRICS);

// Module-level, so the last good set outlives a request; react's cache is per-request.
// The committed snapshot is the floor under that memory: a build worker starts cold,
// and LMArena answers a build's fetch with 429 often enough that without a floor a
// deployment ships with no scores at all for its whole revalidate hour.
const loadFromArena = servingLastGood(fetchArena, (failure) => {
  // A stood-in load is a recovery, not a page error; only a scoreless load is one.
  if (failure.status === "stale") {
    console.warn(
      `arena fetch failed: ${failure.reason}; serving the set measured ${failure.set.measuredAt}`,
    );
    return;
  }
  console.error(`arena unavailable: ${failure.reason}`);
  // TypeScript reads a JSON import literally, so a category absent from one model's
  // metrics becomes an optional key and the map stops matching the shape. The file is
  // our own committed artifact, produced by this module's own fetch, so it is trusted here.
}, ARENA_SNAPSHOT as BenchmarkSet);

const loadArena = cache(loadFromArena);

export { loadArena };
export type { BenchmarkSource };
