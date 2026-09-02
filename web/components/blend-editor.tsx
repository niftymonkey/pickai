// The score blend: one chip per metric with weight steppers, and the mix spoken as percentages.

import { blendSummary, stepWeight } from "@/core/score-view";
import type { Metric } from "@/core/score-view";
import { InfoHover } from "./info-hover";

interface BlendEditorProps {
  metrics: Metric[];
  weights: Record<string, number>;
  /** One sentence on where this source's category scores come from. */
  tip: string;
  onChange: (weights: Record<string, number>) => void;
}

// The negative margin lets a 24px target sit inside the chip's padding without growing the chip.
// The hover is a full accent fill: an active chip's own bg is accent-soft, so a soft wash vanished.
const stepperClass =
  "-my-0.5 inline-flex min-h-6 min-w-6 items-center justify-center rounded px-1 text-xs transition-colors duration-150 hover:bg-accent hover:text-card disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-inherit";

const BlendChip = ({
  metric,
  weight,
  weights,
  onChange,
}: {
  metric: Metric;
  weight: number;
  weights: Record<string, number>;
  onChange: (weights: Record<string, number>) => void;
}) => {
  const down = stepWeight(weights, metric.name, -1);
  const up = stepWeight(weights, metric.name, 1);
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-sm ${
        weight > 0 ? "border-accent bg-accent-soft text-accent-ink" : "border-line text-ink-2"
      }`}
    >
      {metric.label}
      {weight > 0 && <span className="tnum text-xs">{weight}</span>}
      <button
        type="button"
        aria-label={`Less ${metric.label}`}
        disabled={down[metric.name] === weight}
        onClick={() => onChange(down)}
        className={stepperClass}
      >
        &minus;
      </button>
      <button
        type="button"
        aria-label={`More ${metric.label}`}
        disabled={up[metric.name] === weight}
        onClick={() => onChange(up)}
        className={stepperClass}
      >
        +
      </button>
    </span>
  );
};

const BlendEditor = ({ metrics, weights, tip, onChange }: BlendEditorProps) => {
  if (metrics.length < 2) return null;
  const summary = blendSummary(weights);
  return (
    <section aria-label="Score blend" className="mb-3 flex flex-wrap items-center gap-1.5">
      <h2 className="text-xs font-medium tracking-wider text-ink-2 uppercase">Score blend</h2>
      <span className="mr-1 inline-flex">
        <InfoHover label="About these categories" tip={tip} />
      </span>
      {metrics.map((metric) => (
        <BlendChip
          key={metric.name}
          metric={metric}
          weight={weights[metric.name] ?? 0}
          weights={weights}
          onChange={onChange}
        />
      ))}
      {summary !== null && <span className="tnum text-xs text-ink-2">{summary}</span>}
    </section>
  );
};

export { BlendEditor };
