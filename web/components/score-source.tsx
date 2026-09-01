// The score-source switch's face: segmented toggle, measurement caption, terms offer, retry.

import type { BenchmarkSource } from "@/lib/benchmarks";
import type { ScoreSourceId, SourceState } from "@/core/source-switch";
import { InfoHover } from "./info-hover";

interface ScoreSourceProps {
  state: SourceState;
  arena: BenchmarkSource;
  onPick: (source: ScoreSourceId) => void;
  /** The consent button and the retry button both land here. */
  onConfirmFetch: () => void;
}

const SOURCE_TIPS: Record<ScoreSourceId, string> = {
  arena:
    "LMArena ranks models by public votes between two anonymous answers. Each score is an Elo rating.",
  openrouter:
    "Artificial Analysis runs its own benchmark suites and publishes 0-100 index scores. The numbers come via OpenRouter.",
};

const arenaCaption = (arena: BenchmarkSource): string => {
  switch (arena.status) {
    case "ok":
      return `measured ${arena.set.measuredAt}`;
    case "stale":
      return `measured ${arena.set.measuredAt} · live fetch failed, showing the last good data`;
    case "unavailable":
      return `LMArena unavailable (${arena.reason}, scores absent this load)`;
  }
};

const caption = (state: SourceState, arena: BenchmarkSource): string => {
  const { source, openRouter } = state;
  if (source === "openrouter" && openRouter.phase === "ok")
    return `measured ${openRouter.set.measuredAt}`;
  switch (openRouter.phase) {
    case "loading":
      return `still showing LMArena, ${arenaCaption(arena)} · fetching Artificial Analysis from your browser…`;
    case "failed":
      return `${arenaCaption(arena)} · Artificial Analysis unavailable (${openRouter.reason})`;
    default:
      return arenaCaption(arena);
  }
};

const segButton = (active: boolean): string =>
  `px-2.5 py-1 text-xs transition-colors duration-150 ${
    active ? "bg-accent-soft font-medium text-accent-ink" : "text-ink-2 hover:text-ink"
  }`;

const ScoreSource = ({ state, arena, onPick, onConfirmFetch }: ScoreSourceProps) => {
  // A picked-but-unfetched source shows on the toggle; the board flips only when data lands.
  const pending = state.openRouter.phase === "offered" || state.openRouter.phase === "loading";
  const shown: ScoreSourceId = pending ? "openrouter" : state.source;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex min-h-[38px] flex-wrap items-center gap-2">
        <div
          role="group"
          aria-label="Score source"
          className="flex shrink-0 overflow-hidden rounded-md border border-line"
        >
          <button
            type="button"
            aria-pressed={shown === "arena"}
            onClick={() => onPick("arena")}
            className={segButton(shown === "arena")}
          >
            LMArena
          </button>
          <button
            type="button"
            aria-pressed={shown === "openrouter"}
            onClick={() => onPick("openrouter")}
            className={`border-l border-line ${segButton(shown === "openrouter")}`}
          >
            Artificial Analysis
          </button>
        </div>
        <p aria-live="polite" className="tnum text-xs text-ink-3">
          {caption(state, arena)}
        </p>
        <InfoHover label="About this score source" tip={SOURCE_TIPS[shown]} align="right" />
        {state.openRouter.phase === "failed" && (
          <button
            type="button"
            onClick={onConfirmFetch}
            className="rounded-md border border-line bg-card px-2.5 py-1 text-xs text-ink-2 transition-colors duration-150 hover:border-accent"
          >
            Retry
          </button>
        )}
      </div>
      {/* The terms show at the moment of choice, once; the fetch waits for the go button (9.14). */}
      {state.openRouter.phase === "offered" && (
        <div className="max-w-[62ch] rounded-lg border border-line bg-card px-3 py-2.5">
          <p className="text-xs text-ink-3">
            Artificial Analysis numbers come via OpenRouter, fetched by your own browser. AA&apos;s
            terms restrict model-selection uses by its customers, and OpenRouter grants no explicit
            reuse right, so the choice is yours.
          </p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={onConfirmFetch}
              className="rounded-md bg-accent px-2.5 py-1 text-xs font-medium text-card transition-colors duration-150 hover:bg-accent-deep"
            >
              Fetch from my browser
            </button>
            <button
              type="button"
              onClick={() => onPick("arena")}
              className="rounded-md border border-line bg-card px-2.5 py-1 text-xs text-ink-2 transition-colors duration-150 hover:border-accent"
            >
              Keep LMArena
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export { ScoreSource };
