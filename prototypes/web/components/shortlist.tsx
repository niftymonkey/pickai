import type { RatedModel } from "@/lib/benchmarks";

export function Shortlist({
  models,
  onMove,
  onRemove,
}: {
  models: RatedModel[];
  onMove: (index: number, delta: -1 | 1) => void;
  onRemove: (key: string) => void;
}) {
  return (
    <section aria-label="Shortlist" className="flex flex-col gap-2">
      <h2 className="text-xs font-medium uppercase tracking-wider text-rail-ink-3">
        Shortlist
      </h2>
      <p className="text-xs text-rail-ink-2">Your fallback chain, in order.</p>

      {models.length === 0 ? (
        <p className="rounded-lg border border-dashed border-rail-line px-3 py-4 text-sm text-rail-ink-2">
          Pin models from the results to build a chain worth testing.
        </p>
      ) : (
        <ol className="flex flex-col gap-2">
          {models.map((model, index) => (
            <li
              key={model.key}
              className="rounded-lg border border-rail-line bg-rail-card px-3 py-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-baseline gap-2">
                  <span className="tnum font-mono text-xs text-accent">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-rail-ink" title={model.name}>
                      {model.name}
                    </p>
                    <p className="truncate font-mono text-xs text-rail-ink-3">
                      {model.provider}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    aria-label={`Move ${model.name} up`}
                    disabled={index === 0}
                    onClick={() => onMove(index, -1)}
                    className="rounded border border-rail-line px-1.5 text-xs text-rail-ink-2 transition-colors duration-150 hover:border-accent hover:text-rail-ink disabled:opacity-30"
                  >
                    &uarr;
                  </button>
                  <button
                    type="button"
                    aria-label={`Move ${model.name} down`}
                    disabled={index === models.length - 1}
                    onClick={() => onMove(index, 1)}
                    className="rounded border border-rail-line px-1.5 text-xs text-rail-ink-2 transition-colors duration-150 hover:border-accent hover:text-rail-ink disabled:opacity-30"
                  >
                    &darr;
                  </button>
                  <button
                    type="button"
                    aria-label={`Remove ${model.name} from shortlist`}
                    onClick={() => onRemove(model.key)}
                    className="rounded border border-rail-line px-1.5 text-xs text-rail-ink-2 transition-colors duration-150 hover:border-accent hover:text-rail-ink"
                  >
                    &times;
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}

      {models.length > 0 && (
        <p className="text-xs text-rail-ink-3">
          The code export, so this decision can be re-run later, lands in a
          later pass.
        </p>
      )}
    </section>
  );
}
