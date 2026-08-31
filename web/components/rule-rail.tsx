import { useState } from "react";
import {
  CAPABILITY_LABELS,
  fmtTokens,
  ruleLabel,
  type Capability,
  type PipelineStep,
  type Rule,
} from "@/lib/engine";

const CAPABILITIES: Capability[] = [
  "reasoning",
  "toolCall",
  "structuredOutput",
  "openWeights",
];

const CONTEXT_STOPS = [32_000, 128_000, 200_000, 1_000_000];
const OUTPUT_STOPS = [8_000, 16_000, 64_000, 128_000];

type Draft =
  | { kind: "capability" }
  | { kind: "modality" }
  | { kind: "minContext" }
  | { kind: "minOutput" }
  | { kind: "provider"; mode: "allow" | "exclude" }
  | { kind: "maker"; mode: "allow" | "exclude" }
  | { kind: "costFence" };

const DRAFT_GROUPS: { title: string; drafts: { draft: Draft; label: string }[] }[] = [
  {
    title: "What it must do",
    drafts: [
      { draft: { kind: "capability" }, label: "Capability" },
      { draft: { kind: "modality" }, label: "Input type" },
      { draft: { kind: "minContext" }, label: "Min context" },
      { draft: { kind: "minOutput" }, label: "Min output" },
    ],
  },
  {
    title: "Who made it",
    drafts: [
      { draft: { kind: "maker", mode: "allow" }, label: "Only these makers" },
      { draft: { kind: "maker", mode: "exclude" }, label: "Never these makers" },
    ],
  },
  {
    title: "Who sells it, what it costs",
    drafts: [
      { draft: { kind: "provider", mode: "allow" }, label: "Only these sellers" },
      { draft: { kind: "provider", mode: "exclude" }, label: "Never these sellers" },
      { draft: { kind: "costFence" }, label: "Price fence" },
    ],
  },
];

export function RuleRail({
  steps,
  providers,
  makers,
  modalities,
  lastAddedId,
  onAdd,
  onRemove,
  onClearAll,
  resumeCount,
  onResume,
}: {
  steps: PipelineStep[];
  providers: string[];
  makers: string[];
  modalities: string[];
  lastAddedId: string | null;
  onAdd: (rules: Rule[]) => void;
  onRemove: (id: string) => void;
  onClearAll: () => void;
  resumeCount: number;
  onResume: () => void;
}) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [picking, setPicking] = useState(false);

  function add(rules: Rule[]) {
    onAdd(rules);
    setDraft(null);
    setPicking(false);
  }

  return (
    <section aria-label="Your rules" className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <h2 className="text-xs font-medium uppercase tracking-wider text-rail-ink-3">
          Your rules
        </h2>
        {steps.length > 0 && (
          <button
            type="button"
            onClick={onClearAll}
            className="-my-1.5 -mr-1.5 rounded-md px-2.5 py-1.5 text-xs text-rail-ink-3 transition-colors duration-150 hover:bg-rail-hover hover:text-rail-ink"
          >
            Clear all
          </button>
        )}
      </div>

      <ul className="flex flex-col gap-2">
        {steps.map((step) => (
          <li
            key={step.rule.id}
            className={`rounded-lg border border-rail-line bg-rail-card px-3 py-2 ${
              step.rule.id === lastAddedId ? "rule-fire" : ""
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-rail-ink">{ruleLabel(step.rule)}</span>
              <button
                type="button"
                aria-label={`Remove rule: ${ruleLabel(step.rule)}`}
                onClick={() => onRemove(step.rule.id)}
                className="-my-1.5 -mr-1.5 rounded-md px-2.5 py-1.5 text-base leading-none text-rail-ink-3 transition-colors duration-150 hover:bg-rail-hover hover:text-rail-ink"
              >
                &times;
              </button>
            </div>
            <p className="mt-0.5 text-xs text-rail-ink-2">
              {step.cut === 0 ? (
                "cut nothing"
              ) : (
                <>
                  cut{" "}
                  <span className="tnum font-mono">
                    {step.cut.toLocaleString("en-US")}
                  </span>{" "}
                  models,{" "}
                  <span className="tnum font-mono">
                    {step.remaining.toLocaleString("en-US")}
                  </span>{" "}
                  left
                </>
              )}
            </p>
          </li>
        ))}
      </ul>

      {steps.length === 0 && !picking && (
        <p className="text-sm text-rail-ink-2">
          No rules yet. The whole catalog is on the bench.
        </p>
      )}

      {steps.length === 0 && resumeCount > 0 && (
        <button
          type="button"
          onClick={onResume}
          className="rounded-lg border border-accent bg-accent-soft px-3 py-2 text-left text-sm font-medium text-accent-ink transition-colors duration-150 hover:border-accent-deep"
        >
          Pick up last session&rsquo;s rules ({resumeCount})
        </button>
      )}

      {!picking && !draft && (
        <button
          type="button"
          onClick={() => setPicking(true)}
          className="rounded-lg border border-dashed border-rail-line px-3 py-2 text-left text-sm text-rail-ink-2 transition-colors duration-150 hover:border-accent hover:text-rail-ink"
        >
          + Add a rule
        </button>
      )}

      {picking && !draft && (
        <div className="rounded-lg border border-rail-line bg-rail-card p-3">
          {DRAFT_GROUPS.map((group) => (
            <div key={group.title} className="mb-2 last:mb-0">
              <p className="mb-1 text-xs text-rail-ink-3">{group.title}</p>
              <div className="flex flex-wrap gap-1.5">
                {group.drafts.map(({ draft: d, label }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setDraft(d)}
                    className="rounded-md border border-rail-line px-2 py-1 text-xs text-rail-ink transition-colors duration-150 hover:border-accent hover:bg-accent-soft"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setPicking(false)}
            className="mt-1 text-xs text-rail-ink-3 hover:text-rail-ink"
          >
            Cancel
          </button>
        </div>
      )}

      {draft && (
        <div className="rounded-lg border border-rail-line bg-rail-card p-3">
          <DraftForm
            draft={draft}
            providers={providers}
            makers={makers}
            modalities={modalities}
            onAdd={add}
            onCancel={() => setDraft(null)}
          />
        </div>
      )}
    </section>
  );
}

function rid(): string {
  return crypto.randomUUID();
}

function ToggleForm({
  prompt,
  options,
  labels,
  toRule,
  onAdd,
  cancel,
}: {
  prompt: string;
  options: string[];
  labels?: Record<string, string>;
  toRule: (option: string) => Rule;
  onAdd: (rules: Rule[]) => void;
  cancel: React.ReactNode;
}) {
  const [chosen, setChosen] = useState<string[]>([]);

  function toggle(option: string) {
    setChosen((current) =>
      current.includes(option)
        ? current.filter((entry) => entry !== option)
        : [...current, option],
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs text-rail-ink-3">{prompt}</p>
      {options.map((option) => {
        const active = chosen.includes(option);
        return (
          <button
            key={option}
            type="button"
            aria-pressed={active}
            onClick={() => toggle(option)}
            className={`rounded-md border px-2 py-1 text-left text-sm transition-colors duration-150 ${
              active
                ? "border-accent bg-accent-soft text-accent-ink"
                : "border-rail-line text-rail-ink hover:border-accent"
            }`}
          >
            {labels?.[option] ?? option}
          </button>
        );
      })}
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={chosen.length === 0}
          onClick={() => onAdd(chosen.map(toRule))}
          className="rounded-md bg-accent px-2.5 py-1 text-xs font-medium text-card transition-colors duration-150 hover:bg-accent-deep disabled:opacity-40"
        >
          Add {chosen.length > 1 ? `${chosen.length} rules` : "rule"}
        </button>
        {cancel}
      </div>
    </div>
  );
}

function DraftForm({
  draft,
  providers,
  makers,
  modalities,
  onAdd,
  onCancel,
}: {
  draft: Draft;
  providers: string[];
  makers: string[];
  modalities: string[];
  onAdd: (rules: Rule[]) => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState("");

  const cancel = (
    <button
      type="button"
      onClick={onCancel}
      className="text-xs text-rail-ink-3 hover:text-rail-ink"
    >
      Cancel
    </button>
  );

  if (draft.kind === "capability") {
    return (
      <ToggleForm
        prompt="Needs which capabilities? Toggle all that apply."
        options={CAPABILITIES}
        labels={CAPABILITY_LABELS}
        toRule={(option) => {
          const capability = CAPABILITIES.find((entry) => entry === option);
          return {
            id: rid(),
            kind: "capability",
            capability: capability ?? "reasoning",
          };
        }}
        onAdd={onAdd}
        cancel={cancel}
      />
    );
  }

  if (draft.kind === "modality") {
    return (
      <ToggleForm
        prompt="Must accept which inputs? Toggle all that apply."
        options={modalities}
        toRule={(modality) => ({ id: rid(), kind: "modality", modality })}
        onAdd={onAdd}
        cancel={cancel}
      />
    );
  }

  if (draft.kind === "minContext" || draft.kind === "minOutput") {
    const stops = draft.kind === "minContext" ? CONTEXT_STOPS : OUTPUT_STOPS;
    const label =
      draft.kind === "minContext" ? "Context window at least" : "Max output at least";
    return (
      <div className="flex flex-col gap-1.5">
        <p className="text-xs text-rail-ink-3">{label}</p>
        <div className="flex flex-wrap gap-1.5">
          {stops.map((tokens) => (
            <button
              key={tokens}
              type="button"
              onClick={() => onAdd([{ id: rid(), kind: draft.kind, tokens }])}
              className="rounded-md border border-rail-line px-2 py-1 font-mono text-xs text-rail-ink transition-colors duration-150 hover:border-accent hover:bg-accent-soft"
            >
              {fmtTokens(tokens)}
            </button>
          ))}
        </div>
        {cancel}
      </div>
    );
  }

  if (draft.kind === "provider" || draft.kind === "maker") {
    const isMaker = draft.kind === "maker";
    const options = isMaker ? makers : providers;
    const legend = isMaker
      ? draft.mode === "allow"
        ? "Only these makers"
        : "Never these makers"
      : draft.mode === "allow"
        ? "Only these sellers"
        : "Never these sellers";
    const chosen = text
      .split(",")
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
    return (
      <form
        className="flex flex-col gap-1.5"
        onSubmit={(event) => {
          event.preventDefault();
          if (chosen.length === 0) return;
          onAdd([
            isMaker
              ? { id: rid(), kind: "maker", mode: draft.mode, makers: chosen }
              : {
                  id: rid(),
                  kind: "provider",
                  mode: draft.mode,
                  providers: chosen,
                },
          ]);
        }}
      >
        <label className="text-xs text-rail-ink-3" htmlFor="provider-input">
          {legend} (comma-separated)
        </label>
        <input
          id="provider-input"
          list="provider-slugs"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="anthropic, openai"
          className="rounded-md border border-rail-line bg-rail-hover px-2 py-1 text-sm text-rail-ink placeholder:text-rail-ink-3"
        />
        <datalist id="provider-slugs">
          {options.map((option) => (
            <option key={option} value={option} />
          ))}
        </datalist>
        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={chosen.length === 0}
            className="rounded-md bg-accent px-2.5 py-1 text-xs font-medium text-card transition-colors duration-150 hover:bg-accent-deep disabled:opacity-40"
          >
            Add rule
          </button>
          {cancel}
        </div>
      </form>
    );
  }

  return <CostFenceForm onAdd={onAdd} cancel={cancel} />;
}

const SIDES: ("input" | "output")[] = ["input", "output"];

function CostFenceForm({
  onAdd,
  cancel,
}: {
  onAdd: (rules: Rule[]) => void;
  cancel: React.ReactNode;
}) {
  const [side, setSide] = useState<"input" | "output">("input");
  const [ceiling, setCeiling] = useState("50");
  const parsed = Number(ceiling);
  const valid = Number.isFinite(parsed) && parsed > 0;

  return (
    <form
      className="flex flex-col gap-1.5"
      onSubmit={(event) => {
        event.preventDefault();
        if (!valid) return;
        onAdd([{ id: rid(), kind: "costFence", side, ceiling: parsed }]);
      }}
    >
      <p className="text-xs text-rail-ink-3">
        Cut models with a known price above this. Unknown prices are never cut
        by a fence.
      </p>
      <div className="flex gap-1.5">
        {SIDES.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={side === option}
            onClick={() => setSide(option)}
            className={`rounded-md border px-2 py-1 text-xs transition-colors duration-150 ${
              side === option
                ? "border-accent bg-accent-soft text-accent-ink"
                : "border-rail-line text-rail-ink hover:border-accent"
            }`}
          >
            {option}
          </button>
        ))}
      </div>
      <label className="text-xs text-rail-ink-3" htmlFor="fence-ceiling">
        Ceiling, $ per 1M tokens
      </label>
      <input
        id="fence-ceiling"
        inputMode="decimal"
        value={ceiling}
        onChange={(event) => setCeiling(event.target.value)}
        className="w-24 rounded-md border border-rail-line bg-rail-hover px-2 py-1 font-mono text-sm text-rail-ink"
      />
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={!valid}
          className="rounded-md bg-accent px-2.5 py-1 text-xs font-medium text-card transition-colors duration-150 hover:bg-accent-deep disabled:opacity-40"
        >
          Add rule
        </button>
        {cancel}
      </div>
    </form>
  );
}
