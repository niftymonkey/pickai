// The server's benchmark fetch: the LMArena leaderboard, loaded once per render pass.

import { cache } from "react";
import { fromArena } from "pickai";
import type { BenchmarkSet } from "pickai";
import { keepMetrics } from "@/core/score-view";
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
const loadFromArena = servingLastGood(fetchArena, (failure) => {
  // A stood-in load is a recovery, not a page error; only a scoreless load is one.
  if (failure.status === "stale") {
    console.warn(
      `arena fetch failed: ${failure.reason}; serving the set measured ${failure.set.measuredAt}`,
    );
    return;
  }
  console.error(`arena unavailable: ${failure.reason}`);
});

const loadArena = cache(loadFromArena);

export { loadArena };
export type { BenchmarkSource };
