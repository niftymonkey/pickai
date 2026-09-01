// The server's benchmark fetch: the LMArena leaderboard, loaded once per render pass.

import { cache } from "react";
import { fromArena } from "pickai";
import type { BenchmarkSet } from "pickai";
import { keepMetrics } from "@/core/score-view";

type ArenaSource =
  | { status: "ok"; set: BenchmarkSet }
  | { status: "unavailable"; reason: string };

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

const loadArena = cache(async (): Promise<ArenaSource> => {
  try {
    return { status: "ok", set: keepMetrics(await fromArena(), ARENA_METRICS) };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.error(`arena unavailable: ${reason}`);
    return { status: "unavailable", reason };
  }
});

export { loadArena };
export type { ArenaSource };
