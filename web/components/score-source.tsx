// The score-source switch's face: labelled segmented toggle, a hover per option, retry.

import type { BenchmarkSource } from "@/lib/benchmarks";
import type { ScoreSourceId, SourceState } from "@/core/source-switch";
import { InfoHover } from "./info-hover";

interface ScoreSourceProps {
  state: SourceState;
  arena: BenchmarkSource;
  onPick: (source: ScoreSourceId) => void;
  onRetry: () => void;
}

const ARENA_TIP =
  "LMArena ranks models by public votes between two anonymous answers, scored as Elo ratings. Gaps of a few points sit inside the error bars, and a model with few votes moves around. The split publishes about 25 cuts; the six blendable ones are offered here.";

const OPENROUTER_TIP =
  "Artificial Analysis runs its own benchmark suites and publishes 0-100 index scores. Your browser fetches them via OpenRouter, so they never touch this app's server. AA's terms restrict model-selection uses by its customers, and OpenRouter grants no explicit reuse right. Twin configurations of one model carry identical scores.";

// Each option's hover leads with when that source was measured, then how it works.
const arenaTip = (arena: BenchmarkSource): string => {
  switch (arena.status) {
    case "ok":
      return `Measured ${arena.set.measuredAt}. ${ARENA_TIP}`;
    case "stale":
      return `Measured ${arena.set.measuredAt}. The live fetch failed (${arena.reason}), so this is the last good set. ${ARENA_TIP}`;
    case "unavailable":
      return `Not measured this load: the live fetch failed (${arena.reason}) with nothing cached to stand in. ${ARENA_TIP}`;
  }
};

const openRouterTip = (state: SourceState): string => {
  const { openRouter } = state;
  switch (openRouter.phase) {
    case "ok":
      return `Measured ${openRouter.set.measuredAt}. ${OPENROUTER_TIP}`;
    case "loading":
      return `Fetching now. ${OPENROUTER_TIP}`;
    case "failed":
      return `Not fetched: the browser fetch failed (${openRouter.reason}). ${OPENROUTER_TIP}`;
    case "idle":
      return `Not fetched yet; picking this source fetches it. ${OPENROUTER_TIP}`;
  }
};

const TIPS: Record<ScoreSourceId, (state: SourceState, arena: BenchmarkSource) => string> = {
  arena: (_state, arena) => arenaTip(arena),
  openrouter: (state) => openRouterTip(state),
};

// The dates live in the hovers; a visible line is for trouble with the source on the board.
const trouble = (state: SourceState, shown: ScoreSourceId, arena: BenchmarkSource): string | null => {
  if (state.openRouter.phase === "loading") return "fetching from your browser…";
  if (state.openRouter.phase === "failed" && shown === "openrouter")
    return `unavailable (${state.openRouter.reason})`;
  if (shown !== "arena") return null;
  if (arena.status === "stale") return "live fetch failed, showing the last good data";
  if (arena.status === "unavailable") return `unavailable (${arena.reason}, scores absent this load)`;
  return null;
};

// The group cannot clip its corners: an option's tip is absolutely positioned inside it,
// and overflow-hidden made the tip invisible. The end segments round themselves instead.
const segment = (round: "left" | "right"): string =>
  `relative flex ${round === "left" ? "rounded-l-md" : "rounded-r-md"}`;

// The button is the whole cell: its right padding is where the info hover floats, as a
// sibling rather than a child, because a button cannot nest a button.
const segButton = (active: boolean, round: "left" | "right"): string =>
  `w-full py-1 pr-8 pl-2.5 text-left text-xs whitespace-nowrap transition-colors duration-150 ${
    round === "left" ? "rounded-l-md" : "rounded-r-md"
  } ${active ? "bg-accent-soft text-accent-ink" : "text-ink-2 hover:bg-bench-2 hover:text-ink"}`;

// Centered by flex, never by a transform: a transform starts a stacking context, and the
// tip's z-40 would then lose to the table's sticky header.
const segHover = "absolute inset-y-0 right-2 flex items-center";

const ScoreSource = ({ state, arena, onPick, onRetry }: ScoreSourceProps) => {
  // A picked-but-unfetched source shows on the toggle; the board flips only when data lands.
  const shown: ScoreSourceId = state.openRouter.phase === "loading" ? "openrouter" : state.source;
  const note = trouble(state, shown, arena);
  return (
    // The block's width is fixed, not capped: a note that comes and goes changes what
    // the block asks for, and the whole switch then slides under the pointer that
    // caused it. An uncapped block also eats every pixel of the search box.
    <div className="flex min-h-[38px] flex-wrap items-center gap-x-3 gap-y-1 md:w-[26rem] md:shrink-0">
      <h2 className="text-xs font-medium tracking-wider text-ink-2 uppercase">Score source</h2>
      <div
        role="group"
        aria-label="Score source"
        className="flex shrink-0 rounded-md border border-line"
      >
        <div className={segment("left")}>
          <button
            type="button"
            aria-pressed={shown === "arena"}
            onClick={() => onPick("arena")}
            className={segButton(shown === "arena", "left")}
          >
            LMArena
          </button>
          <span className={segHover}>
            <InfoHover label="About LMArena" tip={TIPS.arena(state, arena)} align="right" />
          </span>
        </div>
        <div className={`border-l border-line ${segment("right")}`}>
          <button
            type="button"
            aria-pressed={shown === "openrouter"}
            onClick={() => onPick("openrouter")}
            className={segButton(shown === "openrouter", "right")}
          >
            Artificial Analysis
          </button>
          <span className={segHover}>
            <InfoHover
              label="About Artificial Analysis"
              tip={TIPS.openrouter(state, arena)}
              align="right"
            />
          </span>
        </div>
      </div>
      {/* The live region always exists so a state change is announced; only a real note
          takes a line of its own, so the search keeps its width in the healthy case. */}
      <p aria-live="polite" className={`tnum text-xs text-ink-3 ${note === null ? "" : "basis-full"}`}>
        {note}
      </p>
      {state.openRouter.phase === "failed" && (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-md border border-line bg-card px-2.5 py-1 text-xs text-ink-2 transition-colors duration-150 hover:border-accent"
        >
          Retry
        </button>
      )}
    </div>
  );
};

export { ScoreSource };
