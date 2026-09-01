import { useState } from "react";
import {
  AXIS_LABELS,
  cheapestKnown,
  fmtMultiple,
  fmtRate,
  fmtTokens,
  sortGroups,
  type ModelGroup,
  type SortAxis,
} from "@/lib/engine";
import type { RatedModel } from "@/lib/benchmarks";
import { ModelCard } from "./model-card";
import { PinIcon } from "./pin-icon";

const VISIBLE_ROWS = 60;

/** Multiples compare against "your list"; a list this long is not one. */
const MULTIPLES_LIMIT = 50;

/** Display axis for rating bands, spanning the rated survivors on screen. */
interface Scale {
  min: number;
  max: number;
}

function pct(value: number, scale: Scale): number {
  const clamped = Math.min(scale.max, Math.max(scale.min, value));
  const span = scale.max - scale.min;
  return span <= 0 ? 50 : ((clamped - scale.min) / span) * 100;
}

/** Price axes sort cheapest-first; everything else sorts best/newest-first. */
const ASCENDING_AXES = new Set<SortAxis>(["costIn", "costOut"]);

const COLUMNS: { axis: SortAxis; align: "left" | "right" }[] = [
  { axis: "score", align: "left" },
  { axis: "costIn", align: "right" },
  { axis: "costOut", align: "right" },
  { axis: "context", align: "right" },
  { axis: "output", align: "right" },
  { axis: "released", align: "right" },
  { axis: "cutoff", align: "right" },
];

export function ResultsTable({
  groups,
  axis,
  ranks,
  searchTiers,
  pins,
  onSort,
  onTogglePin,
}: {
  groups: ModelGroup[];
  axis: SortAxis;
  ranks: Map<string, number>;
  /** When searching: direct model matches sort above seller-detail matches. */
  searchTiers: Map<string, number> | null;
  pins: string[];
  onSort: (axis: SortAxis) => void;
  onTogglePin: (key: string) => void;
}) {
  let sorted = sortGroups(groups, axis);
  if (searchTiers) {
    sorted = [...sorted].sort(
      (a, b) => (searchTiers.get(a.key) ?? 9) - (searchTiers.get(b.key) ?? 9),
    );
  }
  const rated = sorted.filter((g) => g.rep.rating !== undefined);
  const unrated = sorted.filter((g) => g.rep.rating === undefined);
  const splitByRating = axis === "score";
  const rows = splitByRating ? rated : sorted;
  const showMultiples = groups.length <= MULTIPLES_LIMIT;
  const reps = groups.map((g) => g.rep);
  const cheapestIn = showMultiples ? cheapestKnown(reps, "costIn") : undefined;
  const cheapestOut = showMultiples ? cheapestKnown(reps, "costOut") : undefined;

  const scale: Scale = { min: Infinity, max: -Infinity };
  for (const group of rated) {
    const rating = group.rep.rating;
    if (!rating) continue;
    if (rating.low < scale.min) scale.min = rating.low;
    if (rating.high > scale.max) scale.max = rating.high;
  }

  return (
    <section aria-label="Surviving models">
      <div className="lg:hidden">
        <div className="mb-2 flex items-center gap-2">
          <label
            htmlFor="sort-axis"
            className="text-xs font-medium uppercase tracking-wider text-ink-2"
          >
            Sort
          </label>
          <select
            id="sort-axis"
            value={axis}
            onChange={(event) => {
              const next = COLUMNS.find(
                (column) => column.axis === event.target.value,
              );
              if (next) onSort(next.axis);
            }}
            className="rounded-lg border border-line bg-card px-2 py-1.5 text-sm text-ink"
          >
            {COLUMNS.map((column) => (
              <option key={column.axis} value={column.axis}>
                {AXIS_LABELS[column.axis]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          {rows.slice(0, VISIBLE_ROWS).map((group) => (
            <ModelCard
              key={group.key}
              group={group}
              rank={ranks.get(group.key)}
              pinned={pins.includes(group.rep.key)}
              onTogglePin={onTogglePin}
            />
          ))}
          {splitByRating && unrated.length > 0 && (
            <p className="hatch rounded-lg border border-line px-3 py-2 text-xs font-medium text-ink-2">
              Unrated: no measured score (
              {unrated.length.toLocaleString("en-US")} models). Absent data
              ranks nowhere.
            </p>
          )}
          {splitByRating &&
            unrated
              .slice(0, Math.max(0, VISIBLE_ROWS - rows.length))
              .map((group) => (
                <ModelCard
                  key={group.key}
                  group={group}
                  rank={ranks.get(group.key)}
                  pinned={pins.includes(group.rep.key)}
                  onTogglePin={onTogglePin}
                />
              ))}
        </div>
      </div>

      <div className="hidden overflow-x-auto rounded-xl border border-line bg-card lg:block">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-line text-[11px] uppercase tracking-wider text-ink-2">
              <th scope="col" className="px-2 py-2 text-right font-medium">
                <abbr title={`Rank in your full list by ${AXIS_LABELS[axis]}`}>
                  #
                </abbr>
              </th>
              <th scope="col" className="px-3 py-2 text-left font-medium">
                Model
              </th>
              {COLUMNS.map((column) => (
                <th
                  key={column.axis}
                  scope="col"
                  aria-sort={
                    axis === column.axis
                      ? ASCENDING_AXES.has(axis)
                        ? "ascending"
                        : "descending"
                      : undefined
                  }
                  className={`px-3 py-2 font-medium ${
                    column.align === "right" ? "text-right" : "text-left"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onSort(column.axis)}
                    className={`rounded px-1 py-0.5 transition-colors duration-150 hover:text-ink ${
                      axis === column.axis ? "text-accent-ink" : ""
                    }`}
                  >
                    {AXIS_LABELS[column.axis]}
                  </button>
                </th>
              ))}
              <th scope="col" className="px-3 py-2 text-right font-medium">
                <span className="sr-only">Pin</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, VISIBLE_ROWS).map((group) => (
              <GroupRows
                key={group.key}
                group={group}
                rank={ranks.get(group.key)}
                scale={scale}
                cheapestIn={cheapestIn}
                cheapestOut={cheapestOut}
                pinned={pins.includes(group.rep.key)}
                onTogglePin={onTogglePin}
              />
            ))}

            {splitByRating && unrated.length > 0 && (
              <tr>
                <td colSpan={10} className="hatch border-y border-line px-3 py-2">
                  <span className="text-xs font-medium text-ink-2">
                    Unrated: no measured score ({unrated.length.toLocaleString("en-US")}{" "}
                    models). Absent data ranks nowhere.
                  </span>
                </td>
              </tr>
            )}
            {splitByRating &&
              unrated
                .slice(0, Math.max(0, VISIBLE_ROWS - rows.length))
                .map((group) => (
                  <GroupRows
                    key={group.key}
                    group={group}
                    rank={ranks.get(group.key)}
                    scale={scale}
                    cheapestIn={cheapestIn}
                    cheapestOut={cheapestOut}
                    pinned={pins.includes(group.rep.key)}
                    onTogglePin={onTogglePin}
                  />
                ))}
          </tbody>
        </table>
      </div>

      {groups.length > VISIBLE_ROWS && (
        <p className="mt-2 text-xs text-ink-3">
          Showing the first {VISIBLE_ROWS} of{" "}
          <span className="tnum font-mono">{groups.length.toLocaleString("en-US")}</span>{" "}
          models. Add rules to narrow the bench.
        </p>
      )}
    </section>
  );
}

function Unknown({ label }: { label: string }) {
  return (
    <span className="hatch inline-block rounded px-1.5 py-0.5 text-xs text-ink-2">
      {label}
    </span>
  );
}

function GroupRows({
  group,
  rank,
  scale,
  cheapestIn,
  cheapestOut,
  pinned,
  onTogglePin,
}: {
  group: ModelGroup;
  rank: number | undefined;
  scale: Scale;
  cheapestIn: number | undefined;
  cheapestOut: number | undefined;
  pinned: boolean;
  onTogglePin: (key: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const model = group.rep;
  const rating = model.rating;
  const extraSellers = group.sellers.length - 1;
  const scoreNotes: string[] = [];
  if (model.blendWanted !== undefined && model.blendWanted > 1) {
    if (model.blendUsed !== undefined && model.blendUsed < model.blendWanted) {
      scoreNotes.push(`${model.blendUsed}/${model.blendWanted} weighted metrics`);
    }
  } else {
    if (rating?.votes !== undefined) {
      scoreNotes.push(`${rating.votes.toLocaleString("en-US")} votes`);
    }
    if (rating && rating.configs > 1) {
      scoreNotes.push(
        `${rating.configs} configs, ${rating.min}-${rating.max} (best: ${rating.bestConfig})`,
      );
    }
  }

  return (
    <>
      <tr
        onClick={() => {
          if (extraSellers > 0) setExpanded((current) => !current);
        }}
        className={`border-b border-line last:border-b-0 hover:bg-bench-2 ${
          extraSellers > 0 ? "cursor-pointer" : ""
        }`}
      >
        <td className="tnum px-2 py-2 text-right font-mono text-xs text-ink-3">
          {rank}
        </td>
        <td className="max-w-60 px-3 py-2">
          <p className="truncate font-medium text-ink" title={model.name}>
            {model.name}
          </p>
          <p className="truncate font-mono text-xs text-ink-3">
            {model.provider}
            {extraSellers > 0 && (
              <button
                type="button"
                aria-expanded={expanded}
                onClick={(event) => {
                  event.stopPropagation();
                  setExpanded((current) => !current);
                }}
                className="ml-1.5 text-xs text-ink-3 underline-offset-2 transition-colors duration-150 hover:text-ink hover:underline"
              >
                {expanded
                  ? "hide sellers"
                  : `· ${extraSellers + 1} sellers`}
              </button>
            )}
          </p>
        </td>

        <td className="px-3 py-2">
          {rating ? (
            <div>
              <div className="flex items-baseline gap-2">
                <span className="tnum font-mono text-ink">{rating.best}</span>
                <span
                  aria-hidden="true"
                  className="relative h-1.5 w-16 rounded-full bg-line"
                >
                  <span
                    className="absolute h-full rounded-full bg-ink-3"
                    style={{
                      left: `${pct(rating.low, scale)}%`,
                      width: `${Math.max(
                        3,
                        pct(rating.high, scale) - pct(rating.low, scale),
                      )}%`,
                    }}
                  />
                </span>
              </div>
              {scoreNotes.length > 0 && (
                <p className="mt-0.5 text-xs text-ink-3">
                  {scoreNotes.join(" · ")}
                </p>
              )}
            </div>
          ) : (
            <Unknown label="unrated" />
          )}
        </td>

        <RateCell rate={model.costIn} cheapest={cheapestIn} />
        <RateCell rate={model.costOut} cheapest={cheapestOut} />

        <td className="tnum px-3 py-2 text-right font-mono text-ink">
          {model.context > 0 ? fmtTokens(model.context) : <Unknown label="unknown" />}
        </td>
        <td className="tnum px-3 py-2 text-right font-mono text-ink">
          {model.output > 0 ? fmtTokens(model.output) : <Unknown label="unknown" />}
        </td>
        <td className="tnum whitespace-nowrap px-3 py-2 text-right font-mono text-xs text-ink-2">
          {model.releaseDate ?? <Unknown label="unknown" />}
        </td>
        <td className="tnum whitespace-nowrap px-3 py-2 text-right font-mono text-xs text-ink-2">
          {model.knowledge ?? <Unknown label="unknown" />}
        </td>

        <td className="px-3 py-2 text-right">
          <button
            type="button"
            aria-pressed={pinned}
            aria-label={
              pinned ? `Unpin ${model.name}` : `Pin ${model.name} to shortlist`
            }
            onClick={(event) => {
              event.stopPropagation();
              onTogglePin(model.key);
            }}
            className={`rounded-md border p-1.5 transition-colors duration-150 ${
              pinned
                ? "border-accent bg-accent-soft text-accent-ink"
                : "border-line text-ink-2 hover:border-accent hover:text-accent-ink"
            }`}
          >
            <PinIcon filled={pinned} />
          </button>
        </td>
      </tr>

      {expanded &&
        group.sellers
          .filter((seller) => seller.key !== model.key)
          .sort((a, b) => a.provider.localeCompare(b.provider))
          .map((seller) => <SellerRow key={seller.key} seller={seller} />)}
    </>
  );
}

function SellerRow({ seller }: { seller: RatedModel }) {
  return (
    <tr className="border-b border-line bg-bench-2 text-xs last:border-b-0">
      <td />
      <td className="px-3 py-1.5 pl-6">
        <span className="font-mono text-ink-2">{seller.provider}</span>
      </td>
      <td className="px-3 py-1.5 text-ink-3">same model, this seller</td>
      <td className="tnum px-3 py-1.5 text-right font-mono text-ink-2">
        {seller.costIn === undefined ? "unknown" : fmtRate(seller.costIn)}
      </td>
      <td className="tnum px-3 py-1.5 text-right font-mono text-ink-2">
        {seller.costOut === undefined ? "unknown" : fmtRate(seller.costOut)}
      </td>
      <td className="tnum px-3 py-1.5 text-right font-mono text-ink-2">
        {seller.context > 0 ? fmtTokens(seller.context) : "unknown"}
      </td>
      <td className="tnum px-3 py-1.5 text-right font-mono text-ink-2">
        {seller.output > 0 ? fmtTokens(seller.output) : "unknown"}
      </td>
      <td colSpan={3} />
    </tr>
  );
}

function RateCell({
  rate,
  cheapest,
}: {
  rate: number | undefined;
  cheapest: number | undefined;
}) {
  if (rate === undefined) {
    return (
      <td className="px-3 py-2 text-right">
        <Unknown label="price unknown" />
      </td>
    );
  }
  return (
    <td className="tnum px-3 py-2 text-right font-mono text-ink">
      {fmtRate(rate)}
      {cheapest !== undefined && rate > 0 && (
        <span className="ml-1 text-xs text-ink-3">{fmtMultiple(rate, cheapest)}</span>
      )}
    </td>
  );
}
