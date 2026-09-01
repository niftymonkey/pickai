// The catalog as a grouped table: one row per model identity.

import type { CatalogRow } from "@/core/catalog-view";
import { formatCutoff, formatPrice, formatReleased, formatTokens } from "@/core/format";

interface CatalogTableProps {
  rows: CatalogRow[];
}

const Unknown = ({ label }: { label: string }) => (
  <span className="hatch inline-block rounded-sm px-1.5 py-0.5 text-xs text-ink-3">{label}</span>
);

const fact = <T,>(value: T | null, render: (value: T) => string, unknownLabel: string) =>
  value === null ? <Unknown label={unknownLabel} /> : render(value);

const numericCell = "tnum px-3 py-2 text-right whitespace-nowrap";
const numericHead = "px-3 py-2 text-right font-medium";

const CatalogTable = ({ rows }: CatalogTableProps) => (
  <div className="overflow-x-auto rounded-lg border border-line bg-card">
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="border-b border-line-2 text-xs tracking-wide text-ink-2 uppercase">
          <th className="px-3 py-2 text-left font-medium">Model</th>
          <th className="px-3 py-2 text-left font-medium">Maker</th>
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
        {rows.map((row) => (
          <tr key={row.key} className="border-b border-line last:border-b-0">
            <td className="px-3 py-2 font-medium whitespace-nowrap">{row.name}</td>
            <td className="px-3 py-2 whitespace-nowrap text-ink-2">
              {fact(row.maker, (maker) => maker, "unknown")}
            </td>
            <td className={numericCell}>{row.sellerCount}</td>
            <td className={numericCell}>{fact(row.costIn, formatPrice, "price unknown")}</td>
            <td className={numericCell}>{fact(row.costOut, formatPrice, "price unknown")}</td>
            <td className={numericCell}>{fact(row.context, formatTokens, "unknown")}</td>
            <td className={numericCell}>{fact(row.output, formatTokens, "unknown")}</td>
            <td className={numericCell}>{fact(row.released, formatReleased, "unknown")}</td>
            <td className={numericCell}>{fact(row.cutoff, formatCutoff, "unknown")}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export { CatalogTable };
