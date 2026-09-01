import { useState } from "react";
import { fmtRate, fmtTokens, type ModelGroup } from "@/lib/engine";
import { PinIcon } from "./pin-icon";

/**
 * The small-screen face of a result: one card per model, tap to open the
 * full facts and the cheapest sellers. The desktop table stays the wide face.
 */

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wider text-ink-3">{label}</dt>
      <dd className="tnum font-mono text-sm text-ink">{value}</dd>
    </div>
  );
}

export function ModelCard({
  group,
  rank,
  pinned,
  onTogglePin,
}: {
  group: ModelGroup;
  rank: number | undefined;
  pinned: boolean;
  onTogglePin: (key: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const model = group.rep;
  const rating = model.rating;
  const extraSellers = group.sellers.length - 1;
  const sellers = group.sellers
    .filter((seller) => seller.key !== model.key)
    .sort((a, b) => a.provider.localeCompare(b.provider))
    .slice(0, 3);

  return (
    <article
      className={`rounded-xl border bg-card ${
        expanded ? "border-accent" : "border-line"
      }`}
    >
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((current) => !current)}
        className="w-full px-3 py-2.5 text-left"
      >
        <span className="flex items-baseline gap-2">
          <span className="tnum w-5 shrink-0 text-right font-mono text-xs text-ink-3">
            {rank}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-ink">
              {model.name}
            </span>
            <span className="block truncate font-mono text-xs text-ink-3">
              {model.provider}
              {extraSellers > 0 && (
                <span className="ml-1.5">· {extraSellers + 1} sellers</span>
              )}
            </span>
          </span>
          <span className="shrink-0 text-right">
            {rating ? (
              <>
                <span className="tnum block font-mono text-sm text-ink">
                  {rating.best}
                </span>
                {model.blendWanted !== undefined && model.blendWanted > 1 ? (
                  model.blendUsed !== undefined &&
                  model.blendUsed < model.blendWanted && (
                    <span className="tnum block text-[11px] text-ink-3">
                      {model.blendUsed}/{model.blendWanted} metrics
                    </span>
                  )
                ) : (
                  rating.votes !== undefined && (
                    <span className="tnum block text-[11px] text-ink-3">
                      {rating.votes.toLocaleString("en-US")} votes
                    </span>
                  )
                )}
              </>
            ) : (
              <span className="hatch inline-block rounded px-1.5 py-0.5 text-xs text-ink-2">
                unrated
              </span>
            )}
          </span>
        </span>

        <span className="mt-1.5 flex gap-4 pl-7 text-xs">
          <span className="text-ink-2">
            In{" "}
            <span className="tnum font-mono text-ink">
              {model.costIn === undefined ? "unknown" : fmtRate(model.costIn)}
            </span>
          </span>
          <span className="text-ink-2">
            Out{" "}
            <span className="tnum font-mono text-ink">
              {model.costOut === undefined ? "unknown" : fmtRate(model.costOut)}
            </span>
          </span>
          <span className="text-ink-2">
            Ctx{" "}
            <span className="tnum font-mono text-ink">
              {model.context > 0 ? fmtTokens(model.context) : "unknown"}
            </span>
          </span>
        </span>
      </button>

      {expanded && (
        <div className="border-t border-line px-3 pb-3 pt-2 pl-10">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
            <Fact
              label="Max output"
              value={model.output > 0 ? fmtTokens(model.output) : "unknown"}
            />
            <Fact label="Released" value={model.releaseDate ?? "unknown"} />
            <Fact label="Cutoff" value={model.knowledge ?? "unknown"} />
            <Fact label="Inputs" value={model.inputModalities.join(", ")} />
          </dl>
          {sellers.length > 0 && (
            <div className="mt-2.5">
              <p className="text-[11px] uppercase tracking-wider text-ink-3">
                Also sold by
              </p>
              <ul className="mt-1 flex flex-col gap-0.5">
                {sellers.map((seller) => (
                  <li key={seller.key} className="flex justify-between text-xs">
                    <span className="font-mono text-ink-2">
                      {seller.provider}
                    </span>
                    <span className="tnum font-mono text-ink-2">
                      {seller.costIn === undefined
                        ? "unknown"
                        : fmtRate(seller.costIn)}{" "}
                      in
                      {seller.costOut === undefined
                        ? ""
                        : ` · ${fmtRate(seller.costOut)} out`}
                    </span>
                  </li>
                ))}
                {extraSellers > sellers.length && (
                  <li className="text-xs text-ink-3">
                    +{extraSellers - sellers.length} more sellers
                  </li>
                )}
              </ul>
            </div>
          )}
          <div className="mt-2.5 flex gap-2">
            <button
              type="button"
              aria-pressed={pinned}
              aria-label={
                pinned
                  ? `Unpin ${model.name}`
                  : `Pin ${model.name} to shortlist`
              }
              onClick={() => onTogglePin(model.key)}
              className={`rounded-md border px-2.5 py-1 transition-colors duration-150 ${
                pinned
                  ? "border-accent bg-accent-soft text-accent-ink"
                  : "border-line text-ink-2 hover:border-accent hover:text-accent-ink"
              }`}
            >
              <PinIcon filled={pinned} />
            </button>
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="rounded-md border border-line px-2.5 py-1 text-xs text-ink-2"
            >
              Collapse
            </button>
          </div>
        </div>
      )}
    </article>
  );
}
