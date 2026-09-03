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

// An active chip is still a control (it turns off); its hover thickens the border via a ring.
const chipClass = (active: boolean): string =>
  `rounded-md border px-2 py-1 text-left text-sm transition-[color,background-color,border-color,box-shadow] duration-150 ${
    active
      ? "border-accent bg-accent-soft text-accent-ink hover:ring-1 hover:ring-accent"
      : "border-rail-line text-rail-ink hover:border-accent"
  }`;

const railInputClass =
  "rounded-md border border-rail-line bg-rail-hover text-rail-ink transition-colors duration-150 placeholder:text-rail-ink-3 hover:border-rail-ink-3";

// Lined-up options. A control inside a row must not look like the row's own readout,
// and a count that lives inside a control grows it on pick and slides its neighbours,
// so a box carries a label and nothing else. State rides on the box and the ink; never
// on font weight, because bold is wider and a wider label moves what follows it.
const optionRowClass = (on: boolean): string =>
  `-mx-1.5 flex min-h-[26px] cursor-pointer items-center gap-2 rounded px-1.5 text-sm transition-colors duration-150 hover:bg-rail-hover ${
    on ? "text-rail-ink" : "text-rail-ink-2"
  }`;

const OptionList = ({ children }: { children: ReactNode }) => (
  <div className="flex flex-col">{children}</div>
);

const CheckRow = ({
  label,
  checked,
  onToggle,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
}) => (
  <label className={optionRowClass(checked)}>
    <input type="checkbox" checked={checked} onChange={onToggle} className="accent-accent" />
    <span>{label}</span>
  </label>
);

const RadioRow = ({
  group,
  label,
  checked,
  onPick,
}: {
  group: string;
  label: string;
  checked: boolean;
  onPick: () => void;
}) => (
  <label className={optionRowClass(checked)}>
    <input
      type="radio"
      name={group}
      checked={checked}
      onChange={onPick}
      className="accent-accent"
    />
    <span>{label}</span>
  </label>
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
  onToggle,
}: {
  picked: Capability[];
  onToggle: (capability: Capability) => void;
}) => (
  <div className="flex flex-col gap-1.5">
    <p className={promptClass}>Needs which capabilities? Tick all that apply.</p>
    <OptionList>
      {CAPABILITIES.map(({ capability, label }) => (
        <CheckRow
          key={capability}
          label={label}
          checked={picked.includes(capability)}
          onToggle={() => onToggle(capability)}
        />
      ))}
    </OptionList>
  </div>
);

const ModalitySide = ({
  side,
  picked,
  names,
  onToggle,
}: {
  side: "input" | "output";
  picked: string[];
  names: string[];
  onToggle: (side: "input" | "output", modality: string) => void;
}) => (
  <div className="flex flex-col gap-1.5">
    <p className={promptClass}>
      {side === "input" ? "Must take which input?" : "Must give which output?"}
    </p>
    <OptionList>
      {names.map((modality) => (
        <CheckRow
          key={modality}
          label={modality}
          checked={picked.includes(modality)}
          onToggle={() => onToggle(side, modality)}
        />
      ))}
    </OptionList>
  </div>
);

const ModalityBody = ({
  picked,
  inputNames,
  outputNames,
  onToggle,
}: {
  picked: { input: string[]; output: string[] };
  inputNames: string[];
  outputNames: string[];
  onToggle: (side: "input" | "output", modality: string) => void;
}) => (
  <div className="flex flex-col gap-2.5">
    <ModalitySide side="input" picked={picked.input} names={inputNames} onToggle={onToggle} />
    <ModalitySide side="output" picked={picked.output} names={outputNames} onToggle={onToggle} />
  </div>
);

const TokenFloorBody = ({
  prompt,
  group,
  stops,
  value,
  onSet,
}: {
  prompt: string;
  /** Names the radio group, so two floor rows never share one. */
  group: string;
  stops: number[];
  value: number | null;
  onSet: (tokens: number | null) => void;
}) => (
  <div className="flex flex-col gap-1.5">
    <p className={promptClass}>{prompt}</p>
    <OptionList>
      {/* A radio cannot be un-picked by clicking it again, so the list carries its own off row. */}
      <RadioRow group={group} label="No floor" checked={value === null} onPick={() => onSet(null)} />
      {stops.map((tokens) => (
        <RadioRow
          key={tokens}
          group={group}
          label={formatTokens(tokens)}
          checked={tokens === value}
          onPick={() => onSet(tokens)}
        />
      ))}
    </OptionList>
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
  // Outside changes (a stop pick, the zero-survivor card) refresh the draft during render,
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
  const group = `fence-${side}`;
  return (
    <div className="flex flex-col gap-1.5">
      <p className={promptClass}>
        {side === "input" ? "Input, $ per 1M tokens" : "Output, $ per 1M tokens"}
      </p>
      <OptionList>
        {/* A radio cannot be un-picked by clicking it again, so the list carries its own off row. */}
        <RadioRow
          group={group}
          label="No ceiling"
          checked={value === null}
          onPick={() => onSet(side, null)}
        />
        {stops.map((ceiling) => (
          <RadioRow
            key={ceiling}
            group={group}
            label={`$${ceiling}`}
            checked={ceiling === value}
            onPick={() => onSet(side, ceiling)}
          />
        ))}
      </OptionList>
      <input
        value={text}
        onChange={(event) => setText(event.target.value)}
        inputMode="decimal"
        aria-label={`${side === "input" ? "Input" : "Output"} ceiling, dollars per million tokens`}
        placeholder="Or a ceiling in dollars"
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") commit();
        }}
        className={`${railInputClass} w-full px-2 py-1 text-xs`}
      />
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
};
export type { CutCount };
