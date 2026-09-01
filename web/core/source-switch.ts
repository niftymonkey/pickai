// The score-source switch: which source feeds the board, and the browser fetch's phases.
// The board never goes dark mid-switch: the active source changes only when data is in hand.

import type { BenchmarkSet } from "pickai";

type ScoreSourceId = "arena" | "openrouter";

/** The browser-side OpenRouter fetch, phase by phase; "offered" is the terms decision (9.14). */
type OpenRouterFetch =
  | { phase: "idle" }
  | { phase: "offered" }
  | { phase: "loading" }
  | { phase: "ok"; set: BenchmarkSet }
  | { phase: "failed"; reason: string };

interface SourceState {
  source: ScoreSourceId;
  openRouter: OpenRouterFetch;
}

/** One machine step: the next state, plus the effects the shell must run. */
interface SourceStep {
  state: SourceState;
  /** True when the shell should start the browser-side fetch. */
  beginFetch: boolean;
  /** True when the active source changed, so the metric vocabulary changed with it. */
  sourceChanged: boolean;
}

const INITIAL_SOURCE: SourceState = { source: "arena", openRouter: { phase: "idle" } };

const still = (state: SourceState): SourceStep => ({
  state,
  beginFetch: false,
  sourceChanged: false,
});

const pickSource = (state: SourceState, next: ScoreSourceId): SourceStep => {
  if (next === "arena") {
    return {
      state: {
        source: "arena",
        // Walking away from an open offer withdraws it.
        openRouter: state.openRouter.phase === "offered" ? { phase: "idle" } : state.openRouter,
      },
      beginFetch: false,
      sourceChanged: state.source !== "arena",
    };
  }
  if (state.source === "openrouter") return still(state);
  switch (state.openRouter.phase) {
    case "ok":
      return { state: { source: "openrouter", openRouter: state.openRouter }, beginFetch: false, sourceChanged: true };
    case "idle":
      return still({ source: "arena", openRouter: { phase: "offered" } });
    case "failed":
      return { state: { source: "arena", openRouter: { phase: "loading" } }, beginFetch: true, sourceChanged: false };
    case "offered":
    case "loading":
      return still(state);
  }
};

// The consent button (from offered) and the retry button (from failed) both land here.
const confirmFetch = (state: SourceState): SourceStep =>
  state.openRouter.phase === "offered" || state.openRouter.phase === "failed"
    ? { state: { source: state.source, openRouter: { phase: "loading" } }, beginFetch: true, sourceChanged: false }
    : still(state);

const fetchLanded = (state: SourceState, set: BenchmarkSet): SourceStep => ({
  state: { source: "openrouter", openRouter: { phase: "ok", set } },
  beginFetch: false,
  sourceChanged: state.source !== "openrouter",
});

const fetchFailed = (state: SourceState, reason: string): SourceStep =>
  still({ source: state.source, openRouter: { phase: "failed", reason } });

export { INITIAL_SOURCE, pickSource, confirmFetch, fetchLanded, fetchFailed };
export type { ScoreSourceId, OpenRouterFetch, SourceState, SourceStep };
