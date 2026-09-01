// The score provenance line and the source switch: which benchmark feeds the score column.

import type { ArenaSource } from "@/lib/benchmarks";

type ScoreSourceId = "arena" | "openrouter";

/** The browser-side OpenRouter fetch, phase by phase; the driver owns the fetch itself. */
type OpenRouterSource =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "ok"; measuredAt: string }
  | { phase: "failed"; reason: string };

interface ScoreSourceProps {
  source: ScoreSourceId;
  arena: ArenaSource;
  openRouter: OpenRouterSource;
  onSwitch: (source: ScoreSourceId) => void;
}

const AA = "Artificial Analysis via OpenRouter";

const provenance = (
  source: ScoreSourceId,
  arena: ArenaSource,
  openRouter: OpenRouterSource,
): string => {
  if (source === "arena") {
    return arena.status === "ok"
      ? `Score: LMArena, ${arena.set.measuredAt}`
      : `Score: LMArena unavailable (${arena.reason}, scores absent this load)`;
  }
  switch (openRouter.phase) {
    case "idle":
    case "loading":
      return `Score: fetching ${AA} from your browser…`;
    case "ok":
      return `Score: ${AA}, ${openRouter.measuredAt}`;
    case "failed":
      return `Score: ${AA} unavailable (${openRouter.reason}, scores absent this load)`;
  }
};

const sourceChip = (active: boolean): string =>
  `rounded-md border px-2 py-0.5 text-xs transition-colors duration-150 ${
    active ? "border-accent bg-accent-soft text-accent-ink" : "border-line text-ink-2 hover:border-accent"
  }`;

const ScoreSource = ({ source, arena, openRouter, onSwitch }: ScoreSourceProps) => (
  <div className="mb-3 flex flex-col gap-1">
    <div className="flex flex-wrap items-center gap-2">
      <p className="text-xs text-ink-2" aria-live="polite">
        {provenance(source, arena, openRouter)}
      </p>
      <div role="group" aria-label="Score source" className="flex gap-1">
        <button
          type="button"
          aria-pressed={source === "arena"}
          onClick={() => onSwitch("arena")}
          className={sourceChip(source === "arena")}
        >
          LMArena
        </button>
        <button
          type="button"
          aria-pressed={source === "openrouter"}
          onClick={() => onSwitch("openrouter")}
          className={sourceChip(source === "openrouter")}
        >
          Artificial Analysis
        </button>
      </div>
    </div>
    {/* The opt-in states why, so the terms decision is made knowingly (decision 9.14). */}
    <p className="text-xs text-ink-3">
      Artificial Analysis numbers come via OpenRouter, fetched by your own browser. AA&apos;s terms
      restrict model-selection uses by its customers, and OpenRouter grants no explicit reuse
      right, so the choice is yours.
    </p>
  </div>
);

export { ScoreSource };
export type { ScoreSourceId, OpenRouterSource };
