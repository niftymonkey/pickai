// The score-source switch's face: labelled segmented toggle, a hover per option, retry.

import type { BenchmarkSource } from "@/lib/benchmarks";
import type { ScoreSourceId, SourceState } from "@/core/source-switch";
import { InfoHover } from "./info-hover";
import type { Tip } from "./info-hover";

interface ScoreSourceProps {
  state: SourceState;
  arena: BenchmarkSource;
  onPick: (source: ScoreSourceId) => void;
  onRetry: () => void;
}

// Grouped, not split on every full stop: how the numbers are made, then what is on offer.
const ARENA_BODY = [
  "Public votes between two anonymous answers, scored as Elo. A few points' gap sits inside the error bars, and a model with few votes drifts.",
  "Six of the roughly 25 published cuts are offered here.",
];

// Grouped by what a reader is asking: first what the number is, then how it reaches you
// and on what terms.
const OPENROUTER_BODY = [
  "Artificial Analysis runs its own benchmark suites and publishes 0-100 indexes. Twin configurations of one model score identically.",
  "Your browser fetches them through OpenRouter, so they never reach this app's server. AA's terms restrict model-selection use by its customers, and OpenRouter grants no explicit reuse right.",
];

// Each option's hover leads with the state of that source, then how it works.
const arenaTip = (arena: BenchmarkSource): Tip => {
  switch (arena.status) {
    case "ok":
      return { status: `Measured ${arena.set.measuredAt}`, body: ARENA_BODY };
    case "stale":
      return {
        status: `Measured ${arena.set.measuredAt}, last good set`,
        body: [`The live fetch failed: ${arena.reason}.`, ...ARENA_BODY],
      };
    case "unavailable":
      return {
        status: "Not measured this load",
        body: [`The live fetch failed (${arena.reason}) with nothing cached to stand in.`, ...ARENA_BODY],
      };
  }
};

const openRouterTip = (state: SourceState): Tip => {
  const { openRouter } = state;
  switch (openRouter.phase) {
    case "ok":
      return { status: `Measured ${openRouter.set.measuredAt}`, body: OPENROUTER_BODY };
    case "loading":
      return { status: "Fetching now", body: OPENROUTER_BODY };
    case "failed":
      return {
        status: "Not fetched",
        body: [`The browser fetch failed: ${openRouter.reason}.`, ...OPENROUTER_BODY],
      };
    case "idle":
      return { status: "Not fetched yet, picking it fetches it", body: OPENROUTER_BODY };
  }
};

const TIPS: Record<ScoreSourceId, (state: SourceState, arena: BenchmarkSource) => Tip> = {
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
  return (
    // No visible label: the Score heading it sits beside already names it, and the group
    // keeps its accessible name. The trouble note is a sibling below, not a member of
    // this row, so the row's height never changes and the heading stays level with it.
    <div className="flex items-center gap-x-3">
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

/**
 * The switch's trouble line. A healthy source says nothing; the live region is always
 * present so a change is announced whether or not it takes a line.
 */
const ScoreSourceNote = ({ state, arena }: Pick<ScoreSourceProps, "state" | "arena">) => {
  const shown: ScoreSourceId = state.openRouter.phase === "loading" ? "openrouter" : state.source;
  return (
    <p aria-live="polite" className="tnum text-xs text-ink-3">
      {trouble(state, shown, arena)}
    </p>
  );
};

export { ScoreSource, ScoreSourceNote };
