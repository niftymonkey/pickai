// One rail row: a permanent, expandable facet whose live state is the rule, plus its controls.

import { useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import type { Capability } from "pickai";
import { formatTokens } from "@/core/format";
import type { Metric } from "@/core/score-view";

interface CutCount {
  cutModels: number;
  cutListings: number;
}

const counted = (n: number, unit: string): string =>
  `${n.toLocaleString("en-US")} ${unit}${n === 1 ? "" : "s"}`;

const CutLine = ({ cut }: { cut: CutCount }) => (
  <p className="mt-0.5 text-xs text-rail-ink-2">
    {cut.cutModels === 0 && cut.cutListings === 0 ? (
      "cut nothing"
    ) : (
      <span className="tnum">
        cut {counted(cut.cutModels, "model")}, {counted(cut.cutListings, "listing")}
      </span>
    )}
  </p>
);

interface FacetRowProps {
  name: string;
  /** The row's state as a sentence; null when the row holds no rule. */
  summary: string | null;
  /** The row's total cut; null when the row holds no rule. */
  cut: CutCount | null;
  open: boolean;
  headerId: string;
  onToggle: () => void;
  onClose: () => void;
  children: ReactNode;
}

const FacetRow = ({
  name,
  summary,
  cut,
  open,
  headerId,
  onToggle,
  onClose,
  children,
}: FacetRowProps) => {
  const headerRef = useRef<HTMLButtonElement>(null);
  const closeOnEscape = (event: KeyboardEvent<HTMLLIElement>) => {
    if (event.key !== "Escape" || !open) return;
    event.stopPropagation();
    onClose();
    headerRef.current?.focus();
  };
  return (
    <li
      className="rounded-lg border border-rail-line bg-rail-card"
      onKeyDown={closeOnEscape}
    >
      <button
        ref={headerRef}
        id={headerId}
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        className="w-full rounded-lg px-3 py-2 text-left transition-colors duration-150 hover:bg-rail-hover"
      >
        {/* Keyed on the summary so a state change remounts and replays the flash. */}
        <div key={summary ?? "off"} className={summary === null ? "" : "rule-fire rounded-md"}>
          <div className="flex items-center justify-between gap-2">
            <span
              className={`text-sm ${summary === null ? "text-rail-ink-2" : "font-medium text-rail-ink"}`}
            >
              {name}
            </span>
            <span
              aria-hidden
              className={`text-xs text-rail-ink-3 transition-transform duration-150 ${open ? "rotate-90" : ""}`}
            >
              &#9656;
            </span>
          </div>
          {summary !== null && (
            <p className="mt-0.5 truncate text-xs text-rail-ink" title={summary}>
              {summary}
            </p>
          )}
          {cut !== null && <CutLine cut={cut} />}
        </div>
      </button>
      {open && <div className="px-3 pb-3">{children}</div>}
    </li>
  );
};

/** The one row with nothing to open: a plain on/off toggle. */
const ToggleRow = ({
  name,
  active,
  cut,
  headerId,
  onToggle,
}: {
  name: string;
  active: boolean;
  cut: CutCount | null;
  headerId: string;
  onToggle: () => void;
}) => (
  <li className="rounded-lg border border-rail-line bg-rail-card">
    <button
      id={headerId}
      type="button"
      aria-pressed={active}
      onClick={onToggle}
      className="w-full rounded-lg px-3 py-2 text-left transition-colors duration-150 hover:bg-rail-hover"
    >
      <div key={active ? "on" : "off"} className={active ? "rule-fire rounded-md" : ""}>
        <div className="flex items-center justify-between gap-2">
          <span className={`text-sm ${active ? "font-medium text-rail-ink" : "text-rail-ink-2"}`}>
            {name}
          </span>
          {active && (
            <span aria-hidden className="text-xs text-accent-ink">
              &#10003;
            </span>
          )}
        </div>
        {cut !== null && <CutLine cut={cut} />}
      </div>
    </button>
  </li>
);

// An active chip is still a control (it turns off); its hover thickens the border via a ring.
const chipClass = (active: boolean): string =>
  `rounded-md border px-2 py-1 text-left text-sm transition-[color,background-color,border-color,box-shadow] duration-150 ${
    active
      ? "border-accent bg-accent-soft text-accent-ink hover:ring-1 hover:ring-accent"
      : "border-rail-line text-rail-ink hover:border-accent"
  }`;

const railInputClass =
  "rounded-md border border-rail-line bg-rail-hover text-rail-ink transition-colors duration-150 placeholder:text-rail-ink-3 hover:border-rail-ink-3";

const ChipCut = ({ cut }: { cut: CutCount | undefined }) =>
  cut === undefined ? null : (
    <span className="tnum ml-1 text-xs opacity-80">· cut {cut.cutModels.toLocaleString("en-US")}</span>
  );

const promptClass = "text-xs text-rail-ink-3";

const CAPABILITIES: { capability: Capability; label: string }[] = [
  { capability: "reasoning", label: "Reasoning" },
  { capability: "toolCall", label: "Tool calling" },
  { capability: "structuredOutput", label: "Structured output" },
  { capability: "openWeights", label: "Open weights" },
];

const CapabilityBody = ({
  picked,
  cuts,
  onToggle,
}: {
  picked: Capability[];
  cuts: Record<string, CutCount>;
  onToggle: (capability: Capability) => void;
}) => (
  <div className="flex flex-col gap-1.5">
    <p className={promptClass}>Needs which capabilities? Toggle all that apply.</p>
    <div className="flex flex-wrap gap-1.5">
      {CAPABILITIES.map(({ capability, label }) => (
        <button
          key={capability}
          type="button"
          aria-pressed={picked.includes(capability)}
          onClick={() => onToggle(capability)}
          className={chipClass(picked.includes(capability))}
        >
          {label}
          {picked.includes(capability) && <ChipCut cut={cuts[`capability:${capability}`]} />}
        </button>
      ))}
    </div>
  </div>
);

const ModalitySide = ({
  side,
  picked,
  names,
  cuts,
  onToggle,
}: {
  side: "input" | "output";
  picked: string[];
  names: string[];
  cuts: Record<string, CutCount>;
  onToggle: (side: "input" | "output", modality: string) => void;
}) => (
  <div className="flex flex-col gap-1.5">
    <p className={promptClass}>{side === "input" ? "Must take which input?" : "Must give which output?"}</p>
    <div className="flex flex-wrap gap-1.5">
      {names.map((modality) => (
        <button
          key={modality}
          type="button"
          aria-pressed={picked.includes(modality)}
          onClick={() => onToggle(side, modality)}
          className={chipClass(picked.includes(modality))}
        >
          {modality}
          {picked.includes(modality) && <ChipCut cut={cuts[`modality:${side}:${modality}`]} />}
        </button>
      ))}
    </div>
  </div>
);

const ModalityBody = ({
  picked,
  inputNames,
  outputNames,
  cuts,
  onToggle,
}: {
  picked: { input: string[]; output: string[] };
  inputNames: string[];
  outputNames: string[];
  cuts: Record<string, CutCount>;
  onToggle: (side: "input" | "output", modality: string) => void;
}) => (
  <div className="flex flex-col gap-2.5">
    <ModalitySide side="input" picked={picked.input} names={inputNames} cuts={cuts} onToggle={onToggle} />
    <ModalitySide side="output" picked={picked.output} names={outputNames} cuts={cuts} onToggle={onToggle} />
  </div>
);

const TokenFloorBody = ({
  prompt,
  stops,
  value,
  onSet,
}: {
  prompt: string;
  stops: number[];
  value: number | null;
  onSet: (tokens: number | null) => void;
}) => (
  <div className="flex flex-col gap-1.5">
    <p className={promptClass}>{prompt}</p>
    <div className="flex flex-wrap gap-1.5">
      {stops.map((tokens) => (
        <button
          key={tokens}
          type="button"
          aria-pressed={tokens === value}
          onClick={() => onSet(tokens === value ? null : tokens)}
          className={`${chipClass(tokens === value)} font-mono text-xs`}
        >
          {formatTokens(tokens)}
        </button>
      ))}
    </div>
  </div>
);

const parsedCeiling = (text: string): number | null => {
  const trimmed = text.trim();
  if (trimmed === "") return null;
  const ceiling = Number(trimmed);
  return Number.isFinite(ceiling) && ceiling > 0 ? ceiling : null;
};

const FenceSide = ({
  side,
  stops,
  value,
  onSet,
}: {
  side: "input" | "output";
  stops: number[];
  value: number | null;
  onSet: (side: "input" | "output", ceiling: number | null) => void;
}) => {
  const [text, setText] = useState(value === null ? "" : String(value));
  const [syncedValue, setSyncedValue] = useState(value);
  // Outside changes (a stop click, the zero-survivor card) refresh the draft during render,
  // keeping the input mounted so focus survives a commit.
  if (value !== syncedValue) {
    setSyncedValue(value);
    setText(value === null ? "" : String(value));
  }
  const commit = () => {
    const ceiling = parsedCeiling(text);
    if (ceiling === null && text.trim() !== "") {
      // An unparseable ceiling reverts to the applied value; nothing changes silently.
      setText(value === null ? "" : String(value));
      return;
    }
    if (ceiling !== value) onSet(side, ceiling);
  };
  return (
    <div className="flex flex-col gap-1.5">
      <p className={promptClass}>{side === "input" ? "Input, $ per 1M tokens" : "Output, $ per 1M tokens"}</p>
      <div className="flex flex-wrap items-center gap-1.5">
        {stops.map((ceiling) => (
          <button
            key={ceiling}
            type="button"
            aria-pressed={ceiling === value}
            onClick={() => onSet(side, ceiling === value ? null : ceiling)}
            className={`${chipClass(ceiling === value)} font-mono text-xs`}
          >
            ${ceiling}
          </button>
        ))}
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          inputMode="decimal"
          aria-label={`${side === "input" ? "Input" : "Output"} ceiling, dollars per million tokens`}
          placeholder="any"
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Enter") commit();
          }}
          className={`${railInputClass} w-16 px-2 py-1 font-mono text-xs`}
        />
      </div>
    </div>
  );
};

const FENCE_STOPS = { input: [1, 5, 15, 50], output: [5, 15, 50, 150] };

const FenceBody = ({
  fences,
  onSet,
}: {
  fences: { input: number | null; output: number | null };
  onSet: (side: "input" | "output", ceiling: number | null) => void;
}) => (
  <div className="flex flex-col gap-2.5">
    <p className={promptClass}>
      Cut models with a known price above this. Unknown prices are never cut by a fence.
    </p>
    <FenceSide side="input" stops={FENCE_STOPS.input} value={fences.input} onSet={onSet} />
    <FenceSide side="output" stops={FENCE_STOPS.output} value={fences.output} onSet={onSet} />
  </div>
);

const KnowledgeBody = ({
  date,
  onSet,
}: {
  date: string | null;
  onSet: (date: string | null) => void;
}) => (
  <div className="flex flex-col gap-1.5">
    <label className={promptClass} htmlFor="facet-knowledge-month">
      Knows the world since at least
    </label>
    <input
      id="facet-knowledge-month"
      type="month"
      value={date ?? ""}
      onChange={(event) => {
        const next = event.target.value;
        if (next === "") onSet(null);
        else if (/^\d{4}-\d{2}$/.test(next)) onSet(next);
      }}
      className={`${railInputClass} w-40 px-2 py-1 text-sm`}
    />
  </div>
);

type MetricFloor = { metric: string; min: number } | null;

const parsedFloor = (text: string): number | null => {
  const trimmed = text.trim();
  if (trimmed === "") return null;
  const min = Number(trimmed);
  return Number.isFinite(min) ? min : null;
};

const MetricFloorBody = ({
  metrics,
  floor,
  onSet,
}: {
  metrics: Metric[];
  floor: MetricFloor;
  onSet: (floor: MetricFloor) => void;
}) => {
  const [text, setText] = useState(floor === null ? "" : String(floor.min));
  const [chosen, setChosen] = useState(floor?.metric ?? metrics[0]?.name ?? "");
  const [syncedFloor, setSyncedFloor] = useState(floor);
  // Outside changes (the zero-survivor card, a source switch) refresh the draft during render,
  // keeping the input mounted so focus survives a commit.
  if (floor !== syncedFloor) {
    setSyncedFloor(floor);
    setText(floor === null ? "" : String(floor.min));
    if (floor !== null) setChosen(floor.metric);
  }
  if (metrics.length === 0) {
    return <p className={promptClass}>No measured metrics this load, so there is nothing to rule on.</p>;
  }
  const commit = () => {
    const min = parsedFloor(text);
    if (min === null && text.trim() !== "") {
      // An unparseable floor reverts to the applied value; nothing changes silently.
      setText(floor === null ? "" : String(floor.min));
      return;
    }
    const next: MetricFloor = min === null ? null : { metric: chosen, min };
    if (next?.metric !== floor?.metric || next?.min !== floor?.min) onSet(next);
  };
  const chooseMetric = (metric: string) => {
    setChosen(metric);
    // An applied floor follows the metric change instantly; a bare draft waits for its value.
    if (floor !== null && metric !== floor.metric) onSet({ metric, min: floor.min });
  };
  return (
    <div className="flex flex-col gap-1.5">
      <p className={promptClass}>
        Keep models whose score on one metric is at least this. Models the metric never measured
        survive and stay unrated.
      </p>
      <div className="flex flex-wrap items-center gap-1.5">
        <select
          value={chosen}
          aria-label="Metric to rule on"
          onChange={(event) => chooseMetric(event.target.value)}
          className={`${railInputClass} px-2 py-1 text-xs`}
        >
          {metrics.map(({ name, label }) => (
            <option key={name} value={name}>
              {label}
            </option>
          ))}
        </select>
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          inputMode="decimal"
          aria-label="Minimum score"
          placeholder="any"
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Enter") commit();
          }}
          className={`${railInputClass} w-20 px-2 py-1 font-mono text-xs`}
        />
      </div>
    </div>
  );
};

export {
  chipClass,
  railInputClass,
  FacetRow,
  ToggleRow,
  CapabilityBody,
  ModalityBody,
  TokenFloorBody,
  FenceBody,
  KnowledgeBody,
  MetricFloorBody,
};
export type { CutCount };
