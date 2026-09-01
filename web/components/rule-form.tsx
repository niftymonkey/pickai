// Composing one rule: the kind picker groups and the per-kind forms the rail opens.

import { useId, useState } from "react";
import type { Capability, Rule } from "pickai";
import { formatTokens } from "@/core/format";

/** The option lists the forms offer, drawn from the live catalog by the driver. */
interface RuleOptions {
  sellers: string[];
  makers: string[];
  inputModalities: string[];
  outputModalities: string[];
}

/** The rule kinds that carry parameters and so need a form. */
type FormKind = Exclude<Rule["kind"], "excludeDeprecated" | "metric">;

/** Everything the picker offers; excludeDeprecated has no parameters and adds directly. */
type PickableKind = FormKind | "excludeDeprecated";

const RULE_KIND_GROUPS: { title: string; picks: { kind: PickableKind; label: string }[] }[] = [
  {
    title: "What it must do",
    picks: [
      { kind: "capability", label: "Capability" },
      { kind: "modality", label: "Modality" },
      { kind: "minContext", label: "Min context" },
      { kind: "minOutput", label: "Min output" },
    ],
  },
  {
    title: "Who made it, who sells it",
    picks: [
      { kind: "maker", label: "Makers" },
      { kind: "provider", label: "Sellers" },
    ],
  },
  {
    title: "Cost and housekeeping",
    picks: [
      { kind: "costFence", label: "Price fence" },
      { kind: "minKnowledge", label: "Knowledge cutoff" },
      { kind: "excludeDeprecated", label: "No deprecated" },
    ],
  },
];

const CAPABILITIES: { capability: Capability; label: string }[] = [
  { capability: "reasoning", label: "Reasoning" },
  { capability: "toolCall", label: "Tool calling" },
  { capability: "structuredOutput", label: "Structured output" },
  { capability: "openWeights", label: "Open weights" },
];

const CONTEXT_STOPS = [32_000, 128_000, 200_000, 1_000_000];
const OUTPUT_STOPS = [8_000, 16_000, 64_000, 128_000];

const SIDES: ("input" | "output")[] = ["input", "output"];
const MODES: ("allow" | "exclude")[] = ["allow", "exclude"];

const promptClass = "text-xs text-rail-ink-3";
const chipClass = (active: boolean): string =>
  `rounded-md border px-2 py-1 text-left text-sm transition-colors duration-150 ${
    active
      ? "border-accent bg-accent-soft text-accent-ink"
      : "border-rail-line text-rail-ink hover:border-accent"
  }`;
const submitClass =
  "rounded-md bg-accent px-2.5 py-1 text-xs font-medium text-card transition-colors duration-150 hover:bg-accent-deep disabled:opacity-40";
const inputClass =
  "rounded-md border border-rail-line bg-rail-hover px-2 py-1 text-sm text-rail-ink placeholder:text-rail-ink-3";

const CancelButton = ({ onCancel }: { onCancel: () => void }) => (
  <button
    type="button"
    onClick={onCancel}
    className="text-xs text-rail-ink-3 transition-colors duration-150 hover:text-rail-ink"
  >
    Cancel
  </button>
);

const SideToggle = ({
  side,
  onPick,
}: {
  side: "input" | "output";
  onPick: (side: "input" | "output") => void;
}) => (
  <div className="flex gap-1.5">
    {SIDES.map((option) => (
      <button
        key={option}
        type="button"
        aria-pressed={side === option}
        onClick={() => onPick(option)}
        className={chipClass(side === option)}
      >
        {option}
      </button>
    ))}
  </div>
);

const CapabilityForm = ({
  initial,
  onSubmit,
  onCancel,
}: {
  initial?: Capability;
  onSubmit: (rule: Rule) => void;
  onCancel: () => void;
}) => (
  <div className="flex flex-col gap-1.5">
    <p className={promptClass}>Needs which capability?</p>
    {CAPABILITIES.map(({ capability, label }) => (
      <button
        key={capability}
        type="button"
        onClick={() => onSubmit({ kind: "capability", capability })}
        className={chipClass(capability === initial)}
      >
        {label}
      </button>
    ))}
    <CancelButton onCancel={onCancel} />
  </div>
);

const ModalityForm = ({
  options,
  initial,
  onSubmit,
  onCancel,
}: {
  options: RuleOptions;
  initial?: { side: "input" | "output"; modality: string };
  onSubmit: (rule: Rule) => void;
  onCancel: () => void;
}) => {
  const [side, setSide] = useState<"input" | "output">(initial ? initial.side : "input");
  const modalities = side === "input" ? options.inputModalities : options.outputModalities;
  return (
    <div className="flex flex-col gap-1.5">
      <p className={promptClass}>{side === "input" ? "Must take which input?" : "Must give which output?"}</p>
      <SideToggle side={side} onPick={setSide} />
      <div className="flex flex-wrap gap-1.5">
        {modalities.map((modality) => (
          <button
            key={modality}
            type="button"
            onClick={() => onSubmit({ kind: "modality", side, modality })}
            className={chipClass(initial?.side === side && initial.modality === modality)}
          >
            {modality}
          </button>
        ))}
      </div>
      <CancelButton onCancel={onCancel} />
    </div>
  );
};

const TokenFloorForm = ({
  kind,
  initial,
  onSubmit,
  onCancel,
}: {
  kind: "minContext" | "minOutput";
  initial?: number;
  onSubmit: (rule: Rule) => void;
  onCancel: () => void;
}) => {
  const stops = kind === "minContext" ? CONTEXT_STOPS : OUTPUT_STOPS;
  return (
    <div className="flex flex-col gap-1.5">
      <p className={promptClass}>
        {kind === "minContext" ? "Context window at least" : "Max output at least"}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {stops.map((tokens) => (
          <button
            key={tokens}
            type="button"
            onClick={() => onSubmit({ kind, tokens })}
            className={`${chipClass(tokens === initial)} font-mono text-xs`}
          >
            {formatTokens(tokens)}
          </button>
        ))}
      </div>
      <CancelButton onCancel={onCancel} />
    </div>
  );
};

const RosterForm = ({
  noun,
  roster,
  initial,
  toRule,
  onSubmit,
  onCancel,
}: {
  noun: "makers" | "sellers";
  roster: string[];
  initial?: { mode: "allow" | "exclude"; names: string[] };
  toRule: (mode: "allow" | "exclude", names: string[]) => Rule;
  onSubmit: (rule: Rule) => void;
  onCancel: () => void;
}) => {
  const [mode, setMode] = useState<"allow" | "exclude">(initial ? initial.mode : "allow");
  const [text, setText] = useState(initial ? initial.names.join(", ") : "");
  const inputId = useId();
  const listId = useId();
  const names = text
    .split(",")
    .map((name) => name.trim())
    .filter((name) => name.length > 0);
  return (
    <form
      className="flex flex-col gap-1.5"
      onSubmit={(event) => {
        event.preventDefault();
        if (names.length > 0) onSubmit(toRule(mode, names));
      }}
    >
      <div className="flex gap-1.5">
        {MODES.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={mode === option}
            onClick={() => setMode(option)}
            className={chipClass(mode === option)}
          >
            {option === "allow" ? "Only these" : "Never these"}
          </button>
        ))}
      </div>
      <label className={promptClass} htmlFor={inputId}>
        {mode === "allow" ? `Only these ${noun}` : `Never these ${noun}`} (comma-separated)
      </label>
      <input
        id={inputId}
        list={listId}
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="anthropic, openai"
        className={inputClass}
      />
      <datalist id={listId}>
        {roster.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>
      <div className="flex items-center gap-2">
        <button type="submit" disabled={names.length === 0} className={submitClass}>
          Save rule
        </button>
        <CancelButton onCancel={onCancel} />
      </div>
    </form>
  );
};

const CostFenceForm = ({
  initial,
  onSubmit,
  onCancel,
}: {
  initial?: { side: "input" | "output"; ceiling: number };
  onSubmit: (rule: Rule) => void;
  onCancel: () => void;
}) => {
  const [side, setSide] = useState<"input" | "output">(initial ? initial.side : "input");
  const [text, setText] = useState(initial ? String(initial.ceiling) : "50");
  const inputId = useId();
  const ceiling = Number(text);
  const valid = Number.isFinite(ceiling) && ceiling > 0;
  return (
    <form
      className="flex flex-col gap-1.5"
      onSubmit={(event) => {
        event.preventDefault();
        if (valid) onSubmit({ kind: "costFence", side, ceiling });
      }}
    >
      <p className={promptClass}>
        Cut models with a known price above this. Unknown prices are never cut by a fence.
      </p>
      <SideToggle side={side} onPick={setSide} />
      <label className={promptClass} htmlFor={inputId}>
        Ceiling, $ per 1M tokens
      </label>
      <input
        id={inputId}
        inputMode="decimal"
        value={text}
        onChange={(event) => setText(event.target.value)}
        className={`${inputClass} w-24 font-mono`}
      />
      <div className="flex items-center gap-2">
        <button type="submit" disabled={!valid} className={submitClass}>
          Save rule
        </button>
        <CancelButton onCancel={onCancel} />
      </div>
    </form>
  );
};

const KnowledgeForm = ({
  initial,
  onSubmit,
  onCancel,
}: {
  initial?: string;
  onSubmit: (rule: Rule) => void;
  onCancel: () => void;
}) => {
  const [date, setDate] = useState(initial ?? "");
  const inputId = useId();
  const valid = /^\d{4}-\d{2}$/.test(date);
  return (
    <form
      className="flex flex-col gap-1.5"
      onSubmit={(event) => {
        event.preventDefault();
        if (valid) onSubmit({ kind: "minKnowledge", date });
      }}
    >
      <label className={promptClass} htmlFor={inputId}>
        Knows the world since at least
      </label>
      <input
        id={inputId}
        type="month"
        value={date}
        onChange={(event) => setDate(event.target.value)}
        className={`${inputClass} w-40`}
      />
      <div className="flex items-center gap-2">
        <button type="submit" disabled={!valid} className={submitClass}>
          Save rule
        </button>
        <CancelButton onCancel={onCancel} />
      </div>
    </form>
  );
};

interface RuleFormProps {
  kind: FormKind;
  options: RuleOptions;
  /** The rule being edited; absent when composing a fresh one. */
  initial?: Rule;
  onSubmit: (rule: Rule) => void;
  onCancel: () => void;
}

const RuleForm = ({ kind, options, initial, onSubmit, onCancel }: RuleFormProps) => {
  switch (kind) {
    case "capability":
      return (
        <CapabilityForm
          initial={initial?.kind === "capability" ? initial.capability : undefined}
          onSubmit={onSubmit}
          onCancel={onCancel}
        />
      );
    case "modality":
      return (
        <ModalityForm
          options={options}
          initial={initial?.kind === "modality" ? initial : undefined}
          onSubmit={onSubmit}
          onCancel={onCancel}
        />
      );
    case "minContext":
    case "minOutput":
      return (
        <TokenFloorForm
          kind={kind}
          initial={initial?.kind === kind ? initial.tokens : undefined}
          onSubmit={onSubmit}
          onCancel={onCancel}
        />
      );
    case "maker":
      return (
        <RosterForm
          noun="makers"
          roster={options.makers}
          initial={initial?.kind === "maker" ? { mode: initial.mode, names: initial.makers } : undefined}
          toRule={(mode, makers) => ({ kind: "maker", mode, makers })}
          onSubmit={onSubmit}
          onCancel={onCancel}
        />
      );
    case "provider":
      return (
        <RosterForm
          noun="sellers"
          roster={options.sellers}
          initial={
            initial?.kind === "provider" ? { mode: initial.mode, names: initial.providers } : undefined
          }
          toRule={(mode, providers) => ({ kind: "provider", mode, providers })}
          onSubmit={onSubmit}
          onCancel={onCancel}
        />
      );
    case "costFence":
      return (
        <CostFenceForm
          initial={initial?.kind === "costFence" ? initial : undefined}
          onSubmit={onSubmit}
          onCancel={onCancel}
        />
      );
    case "minKnowledge":
      return (
        <KnowledgeForm
          initial={initial?.kind === "minKnowledge" ? initial.date : undefined}
          onSubmit={onSubmit}
          onCancel={onCancel}
        />
      );
  }
};

export { RuleForm, RULE_KIND_GROUPS };
export type { RuleOptions, FormKind, PickableKind };
