// One rail row: a permanent, expandable facet whose live state is the rule, plus its controls.

import { useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import type { Capability } from "pickai";
import { formatTokens } from "@/core/format";

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

const chipClass = (active: boolean): string =>
  `rounded-md border px-2 py-1 text-left text-sm transition-colors duration-150 ${
    active
      ? "border-accent bg-accent-soft text-accent-ink"
      : "border-rail-line text-rail-ink hover:border-accent"
  }`;

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
          className="w-16 rounded-md border border-rail-line bg-rail-hover px-2 py-1 font-mono text-xs text-rail-ink placeholder:text-rail-ink-3"
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
      className="w-40 rounded-md border border-rail-line bg-rail-hover px-2 py-1 text-sm text-rail-ink"
    />
  </div>
);

export {
  FacetRow,
  ToggleRow,
  CapabilityBody,
  ModalityBody,
  TokenFloorBody,
  FenceBody,
  KnowledgeBody,
};
export type { CutCount };
