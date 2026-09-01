// The dark rail: nine permanent facet rows in three quiet groups; a rule is a row's live state.

import { useRef, useState } from "react";
import type { ReactNode } from "react";
import { EMPTY_FACETS, facetSummary, toggled, withoutSelection } from "@/core/decision";
import type { Facet, FacetState } from "@/core/decision";
import {
  CapabilityBody,
  FacetRow,
  FenceBody,
  KnowledgeBody,
  MetricFloorBody,
  ModalityBody,
  ToggleRow,
  TokenFloorBody,
} from "./facet-row";
import type { CutCount } from "./facet-row";
import { RosterChecklist } from "./roster-checklist";
import type { Metric } from "@/core/score-view";

/** The option lists the rows offer, drawn from the live catalog and score source by the driver. */
interface RuleOptions {
  sellers: string[];
  makers: string[];
  inputModalities: string[];
  outputModalities: string[];
  metrics: Metric[];
}

/** Present only when the rules cut everything: the heaviest cutter, offered for removal. */
interface EmptiedBy {
  facet: Facet;
  selection: string;
  label: string;
  cutModels: number;
}

interface RuleRailProps {
  state: FacetState;
  /** Cut counts per derived rule, keyed `facet:selection`. */
  cuts: Record<string, CutCount>;
  options: RuleOptions;
  activeRuleCount: number;
  emptiedBy?: EmptiedBy;
  onChange: (state: FacetState) => void;
}

const CONTEXT_STOPS = [32_000, 128_000, 200_000, 1_000_000];
const OUTPUT_STOPS = [8_000, 16_000, 64_000, 128_000];

const ROW_NAMES: Record<Exclude<Facet, "excludeDeprecated">, string> = {
  capability: "Capabilities",
  modality: "Input & output",
  minContext: "Context floor",
  minOutput: "Output floor",
  makers: "Makers",
  sellers: "Sellers",
  costFence: "Price fence",
  minKnowledge: "Knowledge cutoff",
  metricFloor: "Score floor",
};

const GROUPS: { title: string; facets: Facet[] }[] = [
  { title: "What it must do", facets: ["capability", "modality", "minContext", "minOutput"] },
  { title: "Who made it, who sells it", facets: ["makers", "sellers"] },
  { title: "Cost and housekeeping", facets: ["costFence", "minKnowledge", "excludeDeprecated"] },
  { title: "Measured score", facets: ["metricFloor"] },
];

const headerId = (facet: Facet): string => `facet-header-${facet}`;

const rowCut = (cuts: Record<string, CutCount>, facet: Facet): CutCount | null => {
  const own = Object.entries(cuts).filter(([key]) => key.startsWith(`${facet}:`));
  if (own.length === 0) return null;
  return own.reduce(
    (total, [, cut]) => ({
      cutModels: total.cutModels + cut.cutModels,
      cutListings: total.cutListings + cut.cutListings,
    }),
    { cutModels: 0, cutListings: 0 },
  );
};

const counted = (n: number, unit: string): string =>
  `${n.toLocaleString("en-US")} ${unit}${n === 1 ? "" : "s"}`;

const EmptiedByCard = ({ emptiedBy, onRemove }: { emptiedBy: EmptiedBy; onRemove: () => void }) => (
  <div className="rounded-lg border border-rail-line bg-rail-card px-3 py-2.5">
    <p className="text-sm font-medium text-rail-ink">Your rules cut everything.</p>
    <p className="mt-1 text-xs text-rail-ink-2">
      &ldquo;{emptiedBy.label}&rdquo; cut the most (
      <span className="tnum">{counted(emptiedBy.cutModels, "model")}</span>). Loosen it, or remove
      it.
    </p>
    <button
      type="button"
      onClick={onRemove}
      className="mt-2 rounded-md border border-rail-line px-2.5 py-1 text-xs text-rail-ink transition-colors duration-150 hover:border-accent hover:bg-accent-soft hover:text-accent-ink"
    >
      Remove &ldquo;{emptiedBy.label}&rdquo;
    </button>
  </div>
);

const RuleRail = ({ state, cuts, options, activeRuleCount, emptiedBy, onChange }: RuleRailProps) => {
  const [open, setOpen] = useState<Partial<Record<Facet, boolean>>>({});
  const headingRef = useRef<HTMLHeadingElement>(null);

  const toggleOpen = (facet: Facet) =>
    setOpen((current) => ({ ...current, [facet]: !current[facet] }));
  const close = (facet: Facet) => setOpen((current) => ({ ...current, [facet]: false }));

  const clearAll = () => {
    onChange(EMPTY_FACETS);
    headingRef.current?.focus();
  };

  const removeEmptiedBy = ({ facet, selection }: EmptiedBy) => {
    onChange(withoutSelection(state, facet, selection));
    document.getElementById(headerId(facet))?.focus();
  };

  const body = (facet: Exclude<Facet, "excludeDeprecated">): ReactNode => {
    switch (facet) {
      case "capability":
        return (
          <CapabilityBody
            picked={state.capabilities}
            cuts={cuts}
            onToggle={(capability) =>
              onChange({ ...state, capabilities: toggled(state.capabilities, capability) })
            }
          />
        );
      case "modality":
        return (
          <ModalityBody
            picked={state.modalities}
            inputNames={options.inputModalities}
            outputNames={options.outputModalities}
            cuts={cuts}
            onToggle={(side, modality) =>
              onChange({
                ...state,
                modalities: {
                  ...state.modalities,
                  [side]: toggled(state.modalities[side], modality),
                },
              })
            }
          />
        );
      case "minContext":
        return (
          <TokenFloorBody
            prompt="Context window at least"
            stops={CONTEXT_STOPS}
            value={state.minContext}
            onSet={(tokens) => onChange({ ...state, minContext: tokens })}
          />
        );
      case "minOutput":
        return (
          <TokenFloorBody
            prompt="Max output at least"
            stops={OUTPUT_STOPS}
            value={state.minOutput}
            onSet={(tokens) => onChange({ ...state, minOutput: tokens })}
          />
        );
      case "makers":
        return (
          <RosterChecklist
            noun="makers"
            roster={state.makers}
            names={options.makers}
            onChange={(makers) => onChange({ ...state, makers })}
          />
        );
      case "sellers":
        return (
          <RosterChecklist
            noun="sellers"
            roster={state.sellers}
            names={options.sellers}
            onChange={(sellers) => onChange({ ...state, sellers })}
          />
        );
      case "costFence":
        return (
          <FenceBody
            fences={state.fences}
            onSet={(side, ceiling) =>
              onChange({ ...state, fences: { ...state.fences, [side]: ceiling } })
            }
          />
        );
      case "minKnowledge":
        return (
          <KnowledgeBody
            date={state.minKnowledge}
            onSet={(date) => onChange({ ...state, minKnowledge: date })}
          />
        );
      case "metricFloor":
        return (
          <MetricFloorBody
            metrics={options.metrics}
            floor={state.metricFloor}
            onSet={(metricFloor) => onChange({ ...state, metricFloor })}
          />
        );
    }
  };

  return (
    <section aria-label="Your rules" className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <h2
          ref={headingRef}
          tabIndex={-1}
          className="text-xs font-medium tracking-wider text-rail-ink-3 uppercase"
        >
          Your rules
        </h2>
        {activeRuleCount > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="-my-1.5 -mr-1.5 rounded-md px-2.5 py-1.5 text-xs text-rail-ink-3 transition-colors duration-150 hover:bg-rail-hover hover:text-rail-ink"
          >
            Clear all
          </button>
        )}
      </div>

      {activeRuleCount === 0 && (
        <p className="text-sm text-rail-ink-2">No rules yet. The whole catalog is on the bench.</p>
      )}

      {GROUPS.map((group) => (
        <div key={group.title}>
          <p className="mt-1 mb-1.5 text-xs text-rail-ink-3">{group.title}</p>
          <ul className="flex flex-col gap-2">
            {group.facets.map((facet) =>
              facet === "excludeDeprecated" ? (
                <ToggleRow
                  key={facet}
                  name="No deprecated models"
                  active={state.excludeDeprecated}
                  cut={rowCut(cuts, facet)}
                  headerId={headerId(facet)}
                  onToggle={() =>
                    onChange({ ...state, excludeDeprecated: !state.excludeDeprecated })
                  }
                />
              ) : (
                <FacetRow
                  key={facet}
                  name={ROW_NAMES[facet]}
                  summary={facetSummary(state, facet)}
                  cut={rowCut(cuts, facet)}
                  open={open[facet] === true}
                  headerId={headerId(facet)}
                  onToggle={() => toggleOpen(facet)}
                  onClose={() => close(facet)}
                >
                  {body(facet)}
                </FacetRow>
              ),
            )}
          </ul>
        </div>
      ))}

      {/* Always present so the zero-survivor guidance is announced when it appears. */}
      <div aria-live="polite">
        {emptiedBy && (
          <EmptiedByCard emptiedBy={emptiedBy} onRemove={() => removeEmptiedBy(emptiedBy)} />
        )}
      </div>
    </section>
  );
};

export { RuleRail };
export type { RuleOptions, EmptiedBy };
