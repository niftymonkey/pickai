import { METRIC_LABELS } from "@/lib/benchmarks";

/**
 * Weights over named metrics: the user's answer to "what matters this week."
 * Metric names come from the data, so BYOD metrics appear here untouched.
 */
export function BlendEditor({
  available,
  weights,
  onChange,
}: {
  available: string[];
  weights: Record<string, number>;
  onChange: (next: Record<string, number>) => void;
}) {
  const positive = available.filter((name) => (weights[name] ?? 0) > 0);
  const total = positive.reduce((sum, name) => sum + (weights[name] ?? 0), 0);

  function set(name: string, next: number) {
    onChange({ ...weights, [name]: next });
  }

  const summary = positive
    .map(
      (name) =>
        `${Math.round(((weights[name] ?? 0) / total) * 100)}% ${
          METRIC_LABELS[name] ?? name
        }`,
    )
    .join(" + ");

  return (
    <div className="mb-3 flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
      <span className="text-xs font-medium uppercase tracking-wider text-ink-2">
        Score blend
      </span>
      {available.map((name) => {
        const label = METRIC_LABELS[name] ?? name;
        const weight = weights[name] ?? 0;
        const lastPositive = weight > 0 && positive.length === 1;
        return (
          <span
            key={name}
            className={`flex items-center gap-0.5 rounded-lg border px-1 py-0.5 text-xs transition-colors duration-150 ${
              weight > 0
                ? "border-accent bg-accent-soft text-accent-ink"
                : "border-line bg-card text-ink-3"
            }`}
          >
            <button
              type="button"
              aria-label={`Less weight on ${label}`}
              disabled={weight === 0 || lastPositive}
              onClick={() => set(name, weight - 1)}
              className="rounded px-1.5 py-0.5 font-mono disabled:opacity-30"
            >
              -
            </button>
            <span>
              {label}
              {weight > 0 && (
                <span className="tnum ml-1 font-mono">{weight}</span>
              )}
            </span>
            <button
              type="button"
              aria-label={`More weight on ${label}`}
              disabled={weight >= 5}
              onClick={() => set(name, weight + 1)}
              className="rounded px-1.5 py-0.5 font-mono disabled:opacity-30"
            >
              +
            </button>
          </span>
        );
      })}
      {positive.length > 1 && (
        <span className="text-xs text-ink-3">= {summary}</span>
      )}
    </div>
  );
}
