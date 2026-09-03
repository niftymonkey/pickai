// The catalog as a grouped table: one row per model identity, virtualized so
// only the rows in view (plus overscan) reach the DOM; spacer rows keep the
// scroll geometry of the full list. A row opens a panel holding everything about
// that model that is not worth a column of its own.

import { useEffect, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { formatPrice, formatTokens } from "@/core/format";
import { resultsSummary } from "@/core/score-view";
import type { EmptiedBy, Metric, ScoredRow } from "@/core/score-view";
import { ModelPanel } from "./model-panel";

interface CatalogTableProps {
  rows: ScoredRow[];
  /** The metrics the current source publishes, in display order. */
  metrics: Metric[];
  /** Each metric's places and how many models the source measured in it. */
  ranks: Record<string, { places: Record<string, number>; measured: number }>;
  /** One scale across every metric of every rated model; null when none are rated. */
  scale: { min: number; max: number } | null;
  sourceName: string | null;
  measuredAt: string | null;
  /** The rule that cut the most, when the rules left nothing standing. */
  emptiedBy?: EmptiedBy;
  /** True while a search narrows the rows; an empty result is then the search's doing. */
  searching: boolean;
}

// The table layout is fixed, because with only visible rows in the DOM an
// automatic layout would resize columns as rows scroll in and out. A column earns
// its place only if it is scanned across rows while deciding; everything else
// about a model lives in that model's panel. Five columns fit a 1024 window with
// no sideways scroll, which is what makes a narrow layout possible at all.
const MODEL_COLUMN_WIDTH = 280;
const COLUMN_WIDTHS: (number | undefined)[] = [undefined, 130, 120, 120, 100];
const COLUMN_COUNT = COLUMN_WIDTHS.length;
const TABLE_MIN_WIDTH =
  MODEL_COLUMN_WIDTH + COLUMN_WIDTHS.reduce((sum: number, width) => sum + (width ?? 0), 0);

// The name column pins itself to the left edge so scrolling to the far columns never
// leaves a row unidentified. It needs its own background or the cells slide under it.
const stickyName = "sticky left-0 border-r border-line bg-card";

// Rows measure 37px, or 38px when a hatched unknown chip stretches the line
// box; this seeds the virtualizer and measureElement refines per row. A panel is
// far taller, and its own estimate keeps the scrollbar honest before it measures.
const ESTIMATED_ROW_HEIGHT = 38;
const ESTIMATED_PANEL_HEIGHT = 260;

const Unknown = ({ label }: { label: string }) => (
  <span className="hatch inline-block rounded-sm px-1.5 py-0.5 text-xs text-ink-2">{label}</span>
);

const fact = <T,>(value: T | null, render: (value: T) => string, unknownLabel: string) =>
  value === null ? <Unknown label={unknownLabel} /> : render(value);

// A closed disclosure points at what it will reveal, and turns to point at it
// once it is open.
const Chevron = () => (
  <svg
    width="10"
    height="10"
    viewBox="0 0 10 10"
    aria-hidden
    className="shrink-0 text-ink-3 transition-transform duration-150 group-aria-expanded:rotate-90 group-aria-expanded:text-accent-ink"
  >
    <path d="M3 1l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

/** The full-width row between rated and unrated rows; absent data ranks nowhere (rule 1). */
const UnratedDivider = ({ count, last }: { count: number; last: boolean }) => (
  <td colSpan={COLUMN_COUNT} className={`${rowBorder(last)}px-3 py-1.5`}>
    <span className="hatch inline-block rounded-sm px-1.5 py-0.5 text-xs text-ink-2">
      Unrated: no measured score ({count.toLocaleString("en-US")} models). Absent data ranks
      nowhere.
    </span>
  </td>
);

// Borders live on the cells, not the rows: the table is border-separate so the
// sticky header carries its own border and each row's height is its own.
const rowBorder = (last: boolean) => (last ? "" : "border-b border-line ");
const numericCell = (last: boolean) => `${rowBorder(last)}tnum px-3 py-2 text-right whitespace-nowrap`;
const numericHead = "border-b border-line-2 px-3 py-2 text-right font-medium";

// How long the scrollbar stays visible after the last scroll event.
const SCROLLBAR_LINGER_MS = 800;

/** A display line: a model row, its open panel, or the divider that opens the unrated bucket. */
type TableEntry =
  | { kind: "model"; row: ScoredRow }
  | { kind: "panel"; row: ScoredRow }
  | { kind: "divider"; count: number };

const tableEntries = (rows: ScoredRow[], open: ReadonlySet<string>): TableEntry[] => {
  const entries: TableEntry[] = [];
  const firstUnrated = rows.findIndex(({ score }) => score.kind === "unrated");
  rows.forEach((row, index) => {
    if (index === firstUnrated) {
      entries.push({ kind: "divider", count: rows.length - firstUnrated });
    }
    entries.push({ kind: "model", row });
    if (open.has(row.key)) entries.push({ kind: "panel", row });
  });
  return entries;
};

const CatalogTable = ({
  rows,
  metrics,
  ranks,
  scale,
  sourceName,
  measuredAt,
  emptiedBy,
  searching,
}: CatalogTableProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  // Which panels are open is this table's own view state: it reaches no sibling
  // and changes no data, so it does not travel up to the driver.
  const [open, setOpen] = useState<ReadonlySet<string>>(() => new Set());
  const entries = tableEntries(rows, open);

  const togglePanel = (key: string) => {
    setOpen((current) => {
      const next = new Set(current);
      if (!next.delete(key)) next.add(key);
      return next;
    });
  };

  // Syncs with the DOM scroll state: the classes ride the element directly so
  // neither scrolling nor resizing re-renders the table. A region with columns off
  // to the right keeps its scrollbar showing, because a hidden scrollbar is the
  // only thing saying those columns exist.
  useEffect(() => {
    const region = scrollRef.current;
    if (region === null) return;
    let linger: number | undefined;
    const showScrollbarWhileScrolling = () => {
      region.classList.add("scrolling");
      window.clearTimeout(linger);
      linger = window.setTimeout(() => region.classList.remove("scrolling"), SCROLLBAR_LINGER_MS);
    };
    const markOverflow = () => {
      region.classList.toggle("overflowing", region.scrollWidth > region.clientWidth);
    };
    markOverflow();
    const sizes = new ResizeObserver(markOverflow);
    sizes.observe(region);
    region.addEventListener("scroll", showScrollbarWhileScrolling, { passive: true });
    return () => {
      region.removeEventListener("scroll", showScrollbarWhileScrolling);
      sizes.disconnect();
      window.clearTimeout(linger);
    };
  }, []);
  // useVirtualizer returns functions the React Compiler cannot memoize, so it
  // skips this component; nothing virtualizer-derived leaves it.
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer<HTMLDivElement, HTMLTableRowElement>({
    count: entries.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (index) =>
      entries[index].kind === "panel" ? ESTIMATED_PANEL_HEIGHT : ESTIMATED_ROW_HEIGHT,
    overscan: 10,
    useFlushSync: false,
  });
  const items = virtualizer.getVirtualItems();
  const padTop = items.length === 0 ? 0 : items[0].start;
  const padBottom =
    items.length === 0 ? 0 : virtualizer.getTotalSize() - items[items.length - 1].end;

  return (
    <>
      {/* The count and the census live in the decision line and the Results row above.
          What is left here is the guidance for a board with nothing on it, which neither
          of those can say. */}
      {rows.length === 0 && (
        <p aria-live="polite" className="mb-1.5 text-sm text-ink-2">
          {resultsSummary(rows, { emptiedBy: emptiedBy ?? null, searching })}
        </p>
      )}
      <div
        ref={scrollRef}
        tabIndex={0}
        role="region"
        aria-label="Model catalog"
        className="quiet-scrollbar max-h-[max(20rem,calc(100dvh-11.25rem))] overflow-auto rounded-lg border border-line bg-card"
      >
      <table
        className="w-full border-separate border-spacing-0 text-sm"
        style={{ tableLayout: "fixed", minWidth: TABLE_MIN_WIDTH }}
        aria-rowcount={entries.length + 1}
      >
        <colgroup>
          {COLUMN_WIDTHS.map((width, column) => (
            <col key={column} style={width === undefined ? undefined : { width }} />
          ))}
        </colgroup>
        <thead className="sticky top-0 z-10 bg-card">
          <tr className="text-xs tracking-wide text-ink-2 uppercase">
            {/* z-20: the corner cell is sticky in both axes and must outrank the
                sticky thead as well as the sticky name cells below it. */}
            <th className={`${stickyName} z-20 border-b border-line-2 px-3 py-2 text-left font-medium`}>
              Model
            </th>
            <th className="border-b border-line-2 px-3 py-2 text-left font-medium">Score</th>
            <th className={numericHead}>Input $/M</th>
            <th className={numericHead}>Output $/M</th>
            <th className={numericHead}>Context</th>
          </tr>
        </thead>
        <tbody>
          {entries.length === 0 && (
            <tr>
              <td colSpan={COLUMN_COUNT} className="px-3 py-6 text-sm text-ink-2">
                {searching
                  ? "Nothing here matches that name. Clear the search, or loosen a rule."
                  : "Nothing to show. Loosen or remove a rule to bring models back."}
              </td>
            </tr>
          )}
          {padTop > 0 && (
            <tr aria-hidden style={{ height: padTop }}>
              <td colSpan={COLUMN_COUNT} className="p-0" />
            </tr>
          )}
          {items.map((item) => {
            const entry = entries[item.index];
            const last = item.index === entries.length - 1;
            const rowProps = {
              ref: virtualizer.measureElement,
              "data-index": item.index,
              "aria-rowindex": item.index + 2,
            };
            if (entry.kind === "divider") {
              return (
                <tr key="unrated-divider" {...rowProps}>
                  <UnratedDivider count={entry.count} last={last} />
                </tr>
              );
            }
            if (entry.kind === "panel") {
              return (
                <tr key={`${entry.row.key}-panel`} {...rowProps}>
                  <td
                    colSpan={COLUMN_COUNT}
                    className="border-b-2 border-line-2 bg-bench-2 p-0"
                  >
                    <ModelPanel
                      row={entry.row}
                      metrics={metrics}
                      ranks={ranks}
                      scale={scale}
                      sourceName={sourceName}
                      measuredAt={measuredAt}
                    />
                  </td>
                </tr>
              );
            }
            const { row } = entry;
            const expanded = open.has(row.key);
            return (
              <tr key={row.key} {...rowProps} className={expanded ? "bg-accent-soft" : undefined}>
                <td className={`${stickyName} ${rowBorder(last)}px-3 py-1.5 ${expanded ? "bg-accent-soft" : ""}`}>
                  <button
                    type="button"
                    aria-expanded={expanded}
                    onClick={() => togglePanel(row.key)}
                    className="group flex w-full items-center gap-2 overflow-hidden text-left"
                  >
                    <Chevron />
                    <span className="min-w-0">
                      <span
                        className={`block truncate font-medium ${expanded ? "text-accent-ink" : ""}`}
                        title={row.name}
                      >
                        {row.name}
                      </span>
                      <span className="block truncate text-xs text-ink-3">
                        {row.maker ?? "maker unknown"}
                      </span>
                    </span>
                  </button>
                </td>
                <td className={`${rowBorder(last)}px-3 py-2`}>
                  {row.score.kind === "unrated" ? (
                    <Unknown label="unrated" />
                  ) : (
                    <span className="tnum font-medium">{row.score.value}</span>
                  )}
                </td>
                <td className={numericCell(last)}>{fact(row.costIn, formatPrice, "price unknown")}</td>
                <td className={numericCell(last)}>{fact(row.costOut, formatPrice, "price unknown")}</td>
                <td className={numericCell(last)}>{fact(row.context, formatTokens, "unknown")}</td>
              </tr>
            );
          })}
          {padBottom > 0 && (
            <tr aria-hidden style={{ height: padBottom }}>
              <td colSpan={COLUMN_COUNT} className="p-0" />
            </tr>
          )}
        </tbody>
      </table>
      </div>
    </>
  );
};

export { CatalogTable };
