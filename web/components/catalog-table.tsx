// The catalog as a grouped table: one row per model identity, virtualized so
// only the rows in view (plus overscan) reach the DOM; spacer rows keep the
// scroll geometry of the full list.

import { useEffect, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { formatCutoff, formatPrice, formatReleased, formatTokens } from "@/core/format";
import type { ScoreCell, ScoredRow } from "@/core/score-view";

interface CatalogTableProps {
  rows: ScoredRow[];
  /** The band scale across every rated survivor; null when none are rated. */
  scale: { min: number; max: number } | null;
}

// The table layout is fixed, because with only visible rows in the DOM an
// automatic layout would resize columns as rows scroll in and out. The numeric
// columns are pinned at the full catalog's natural max-content widths; Model
// and Maker take the leftover width and truncate, so any name fits any window.
const COLUMN_WIDTHS: (number | undefined)[] = [undefined, 150, 168, 78, 117, 117, 87, 104, 89, 89];
const COLUMN_COUNT = COLUMN_WIDTHS.length;
const TABLE_MIN_WIDTH = 1120;

// Rows measure 37px, or 38px when a hatched unknown chip stretches the line
// box; this seeds the virtualizer and measureElement refines per row.
const ESTIMATED_ROW_HEIGHT = 38;

const Unknown = ({ label }: { label: string }) => (
  <span className="hatch inline-block rounded-sm px-1.5 py-0.5 text-xs text-ink-2">{label}</span>
);

const fact = <T,>(value: T | null, render: (value: T) => string, unknownLabel: string) =>
  value === null ? <Unknown label={unknownLabel} /> : render(value);

// The filled span sits on the shared scale; a hair of minimum width keeps a tight interval visible.
const BAND_MIN_WIDTH_PCT = 3;

const Band = ({ score, scale }: { score: { low: number; high: number }; scale: { min: number; max: number } }) => {
  const span = scale.max - scale.min;
  const left = span <= 0 ? 0 : ((score.low - scale.min) / span) * 100;
  const width =
    span <= 0 ? 100 : Math.max(BAND_MIN_WIDTH_PCT, ((score.high - score.low) / span) * 100);
  return (
    <span aria-hidden className="relative inline-block h-1.5 w-16 shrink-0 rounded-full bg-bench-2">
      <span
        className="absolute inset-y-0 rounded-full bg-accent"
        style={{ left: `${left}%`, width: `${Math.min(width, 100 - left)}%` }}
      />
    </span>
  );
};

const ScoreFact = ({ score, scale }: { score: ScoreCell; scale: { min: number; max: number } | null }) => {
  if (score.kind === "unrated") return <Unknown label="unrated" />;
  const notes = [score.note, score.configNote].filter((note) => note !== null).join(" · ");
  return (
    <div className="flex flex-col">
      <span className="flex items-center gap-2">
        <span className="tnum font-medium">{score.value}</span>
        {scale !== null && <Band score={score} scale={scale} />}
      </span>
      {notes !== "" && <span className="tnum text-xs text-ink-2">{notes}</span>}
    </div>
  );
};

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

/** A display line: a model row, or the one divider that opens the unrated bucket. */
type TableEntry =
  | { kind: "model"; row: ScoredRow }
  | { kind: "divider"; count: number };

const tableEntries = (rows: ScoredRow[]): TableEntry[] => {
  const firstUnrated = rows.findIndex(({ score }) => score.kind === "unrated");
  if (firstUnrated === -1) return rows.map((row) => ({ kind: "model", row }));
  return [
    ...rows.slice(0, firstUnrated).map((row): TableEntry => ({ kind: "model", row })),
    { kind: "divider", count: rows.length - firstUnrated },
    ...rows.slice(firstUnrated).map((row): TableEntry => ({ kind: "model", row })),
  ];
};

const CatalogTable = ({ rows, scale }: CatalogTableProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const entries = tableEntries(rows);

  // Syncs with the DOM scroll state: the class rides the element directly so
  // scrolling never re-renders the table.
  useEffect(() => {
    const region = scrollRef.current;
    if (region === null) return;
    let linger: number | undefined;
    const showScrollbarWhileScrolling = () => {
      region.classList.add("scrolling");
      window.clearTimeout(linger);
      linger = window.setTimeout(() => region.classList.remove("scrolling"), SCROLLBAR_LINGER_MS);
    };
    region.addEventListener("scroll", showScrollbarWhileScrolling, { passive: true });
    return () => {
      region.removeEventListener("scroll", showScrollbarWhileScrolling);
      window.clearTimeout(linger);
    };
  }, []);
  // useVirtualizer returns functions the React Compiler cannot memoize, so it
  // skips this component; nothing virtualizer-derived leaves it.
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer<HTMLDivElement, HTMLTableRowElement>({
    count: entries.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ESTIMATED_ROW_HEIGHT,
    overscan: 10,
    useFlushSync: false,
  });
  const items = virtualizer.getVirtualItems();
  const padTop = items.length === 0 ? 0 : items[0].start;
  const padBottom =
    items.length === 0 ? 0 : virtualizer.getTotalSize() - items[items.length - 1].end;

  return (
    <div
      ref={scrollRef}
      className="quiet-scrollbar max-h-[max(20rem,calc(100dvh-11.25rem))] overflow-auto rounded-lg border border-line bg-card"
    >
      <table
        className="w-full border-separate border-spacing-0 text-sm"
        style={{ tableLayout: "fixed", minWidth: TABLE_MIN_WIDTH }}
      >
        <colgroup>
          {COLUMN_WIDTHS.map((width, column) => (
            <col key={column} style={width === undefined ? undefined : { width }} />
          ))}
        </colgroup>
        <thead className="sticky top-0 z-10 bg-card">
          <tr className="text-xs tracking-wide text-ink-2 uppercase">
            <th className="border-b border-line-2 px-3 py-2 text-left font-medium">Model</th>
            <th className="border-b border-line-2 px-3 py-2 text-left font-medium">Maker</th>
            <th className="border-b border-line-2 px-3 py-2 text-left font-medium">Score</th>
            <th className={numericHead}>Sellers</th>
            <th className={numericHead}>Input $/M</th>
            <th className={numericHead}>Output $/M</th>
            <th className={numericHead}>Context</th>
            <th className={numericHead}>Max output</th>
            <th className={numericHead}>Released</th>
            <th className={numericHead}>Cutoff</th>
          </tr>
        </thead>
        <tbody>
          {padTop > 0 && (
            <tr aria-hidden style={{ height: padTop }}>
              <td colSpan={COLUMN_COUNT} className="p-0" />
            </tr>
          )}
          {items.map((item) => {
            const entry = entries[item.index];
            const last = item.index === entries.length - 1;
            if (entry.kind === "divider") {
              return (
                <tr key="unrated-divider" ref={virtualizer.measureElement} data-index={item.index}>
                  <UnratedDivider count={entry.count} last={last} />
                </tr>
              );
            }
            const { row } = entry;
            return (
              <tr
                key={row.key}
                ref={virtualizer.measureElement}
                data-index={item.index}
              >
                <td className={`${rowBorder(last)}truncate px-3 py-2 font-medium`} title={row.name}>
                  {row.name}
                </td>
                <td
                  className={`${rowBorder(last)}truncate px-3 py-2 text-ink-2`}
                  title={row.maker ?? undefined}
                >
                  {fact(row.maker, (maker) => maker, "unknown")}
                </td>
                <td className={`${rowBorder(last)}px-3 py-2`}>
                  <ScoreFact score={row.score} scale={scale} />
                </td>
                <td className={numericCell(last)}>{row.sellerCount}</td>
                <td className={numericCell(last)}>{fact(row.costIn, formatPrice, "price unknown")}</td>
                <td className={numericCell(last)}>{fact(row.costOut, formatPrice, "price unknown")}</td>
                <td className={numericCell(last)}>{fact(row.context, formatTokens, "unknown")}</td>
                <td className={numericCell(last)}>{fact(row.output, formatTokens, "unknown")}</td>
                <td className={numericCell(last)}>{fact(row.released, formatReleased, "unknown")}</td>
                <td className={numericCell(last)}>{fact(row.cutoff, formatCutoff, "unknown")}</td>
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
  );
};

export { CatalogTable };
