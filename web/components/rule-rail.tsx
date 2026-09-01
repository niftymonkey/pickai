// The dark rail's rule list: each card speaks its rule's words and shows its cut in both units.

import { useState } from "react";
import type { Rule } from "pickai";
import { RULE_KIND_GROUPS, RuleForm } from "./rule-form";
import type { FormKind, RuleOptions } from "./rule-form";

interface RuleCard {
  id: string;
  rule: Rule;
  label: string;
  cutModels: number;
  cutListings: number;
}

/** Present only when the rules cut everything: the heaviest cutter, offered for removal. */
interface EmptiedBy {
  id: string;
  label: string;
  cutModels: number;
}

interface RuleRailProps {
  cards: RuleCard[];
  options: RuleOptions;
  emptiedBy?: EmptiedBy;
  onAdd: (rule: Rule) => void;
  onUpdate: (id: string, rule: Rule) => void;
  onRemove: (id: string) => void;
  onClearAll: () => void;
}

type AddState = null | { stage: "picking" } | { stage: "form"; kind: FormKind };

const editableKind = (rule: Rule): FormKind | null => {
  switch (rule.kind) {
    case "excludeDeprecated":
    case "metric":
      return null;
    default:
      return rule.kind;
  }
};

const counted = (n: number, unit: string): string =>
  `${n.toLocaleString("en-US")} ${unit}${n === 1 ? "" : "s"}`;

const cardActionClass =
  "-my-1 rounded-md px-2 py-1 text-xs text-rail-ink-3 transition-colors duration-150 hover:bg-rail-hover hover:text-rail-ink";

const CutLine = ({ cutModels, cutListings }: { cutModels: number; cutListings: number }) => (
  <p className="mt-0.5 text-xs text-rail-ink-2">
    {cutModels === 0 && cutListings === 0 ? (
      "cut nothing"
    ) : (
      <span className="tnum">
        cut {counted(cutModels, "model")}, {counted(cutListings, "listing")}
      </span>
    )}
  </p>
);

const EmptiedByCard = ({ emptiedBy, onRemove }: { emptiedBy: EmptiedBy; onRemove: (id: string) => void }) => (
  <div className="rounded-lg border border-rail-line bg-rail-card px-3 py-2.5">
    <p className="text-sm font-medium text-rail-ink">Your rules cut everything.</p>
    <p className="mt-1 text-xs text-rail-ink-2">
      &ldquo;{emptiedBy.label}&rdquo; cut the most (
      <span className="tnum">{counted(emptiedBy.cutModels, "model")}</span>). Loosen it, or remove
      it.
    </p>
    <button
      type="button"
      onClick={() => onRemove(emptiedBy.id)}
      className="mt-2 rounded-md border border-rail-line px-2.5 py-1 text-xs text-rail-ink transition-colors duration-150 hover:border-accent hover:bg-accent-soft hover:text-accent-ink"
    >
      Remove &ldquo;{emptiedBy.label}&rdquo;
    </button>
  </div>
);

const KindPicker = ({
  onPick,
  onCancel,
}: {
  onPick: (kind: FormKind | "excludeDeprecated") => void;
  onCancel: () => void;
}) => (
  <div className="rounded-lg border border-rail-line bg-rail-card p-3">
    {RULE_KIND_GROUPS.map((group) => (
      <div key={group.title} className="mb-2 last:mb-0">
        <p className="mb-1 text-xs text-rail-ink-3">{group.title}</p>
        <div className="flex flex-wrap gap-1.5">
          {group.picks.map(({ kind, label }) => (
            <button
              key={kind}
              type="button"
              onClick={() => onPick(kind)}
              className="rounded-md border border-rail-line px-2 py-1 text-xs text-rail-ink transition-colors duration-150 hover:border-accent hover:bg-accent-soft hover:text-accent-ink"
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    ))}
    <button
      type="button"
      onClick={onCancel}
      className="mt-1 text-xs text-rail-ink-3 transition-colors duration-150 hover:text-rail-ink"
    >
      Cancel
    </button>
  </div>
);

const RuleRail = ({ cards, options, emptiedBy, onAdd, onUpdate, onRemove, onClearAll }: RuleRailProps) => {
  const [addState, setAddState] = useState<AddState>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const add = (rule: Rule) => {
    onAdd(rule);
    setAddState(null);
  };
  const update = (id: string, rule: Rule) => {
    onUpdate(id, rule);
    setEditingId(null);
  };
  const pick = (kind: FormKind | "excludeDeprecated") => {
    if (kind === "excludeDeprecated") add({ kind });
    else setAddState({ stage: "form", kind });
  };

  return (
    <section aria-label="Your rules" className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <h2 className="text-xs font-medium tracking-wider text-rail-ink-3 uppercase">Your rules</h2>
        {cards.length > 0 && (
          <button
            type="button"
            onClick={onClearAll}
            className="-my-1.5 -mr-1.5 rounded-md px-2.5 py-1.5 text-xs text-rail-ink-3 transition-colors duration-150 hover:bg-rail-hover hover:text-rail-ink"
          >
            Clear all
          </button>
        )}
      </div>

      {cards.length === 0 && addState === null && (
        <p className="text-sm text-rail-ink-2">No rules yet. The whole catalog is on the bench.</p>
      )}

      <ul className="flex flex-col gap-2">
        {cards.map((card) => {
          const kind = editableKind(card.rule);
          return (
            <li key={card.id} className="rounded-lg border border-rail-line bg-rail-card px-3 py-2">
              {editingId === card.id && kind !== null ? (
                <RuleForm
                  kind={kind}
                  options={options}
                  initial={card.rule}
                  onSubmit={(rule) => update(card.id, rule)}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-rail-ink">{card.label}</span>
                    <span className="flex shrink-0 items-center">
                      {kind !== null && (
                        <button
                          type="button"
                          aria-label={`Edit rule: ${card.label}`}
                          onClick={() => setEditingId(card.id)}
                          className={cardActionClass}
                        >
                          Edit
                        </button>
                      )}
                      <button
                        type="button"
                        aria-label={`Remove rule: ${card.label}`}
                        onClick={() => onRemove(card.id)}
                        className={`${cardActionClass} -mr-1.5 text-base leading-none`}
                      >
                        &times;
                      </button>
                    </span>
                  </div>
                  <CutLine cutModels={card.cutModels} cutListings={card.cutListings} />
                </>
              )}
            </li>
          );
        })}
      </ul>

      {emptiedBy && <EmptiedByCard emptiedBy={emptiedBy} onRemove={onRemove} />}

      {addState === null && (
        <button
          type="button"
          onClick={() => setAddState({ stage: "picking" })}
          className="rounded-lg border border-dashed border-rail-line px-3 py-2 text-left text-sm text-rail-ink-2 transition-colors duration-150 hover:border-accent hover:text-rail-ink"
        >
          + Add a rule
        </button>
      )}

      {addState?.stage === "picking" && (
        <KindPicker onPick={pick} onCancel={() => setAddState(null)} />
      )}

      {addState?.stage === "form" && (
        <div className="rounded-lg border border-rail-line bg-rail-card p-3">
          <RuleForm
            kind={addState.kind}
            options={options}
            onSubmit={add}
            onCancel={() => setAddState(null)}
          />
        </div>
      )}
    </section>
  );
};

export { RuleRail };
export type { RuleCard, EmptiedBy };
