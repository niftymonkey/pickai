// The score blend: one chip per metric with weight steppers, and the mix spoken as a sentence.

import { stepWeight } from "@/core/score-view";
import type { Metric } from "@/core/score-view";
import { InfoHover } from "./info-hover";
import type { Tip } from "./info-hover";

interface BlendEditorProps {
  metrics: Metric[];
  weights: Record<string, number>;
  /** Where this source's category scores come from. */
  tip: Tip;
  onChange: (weights: Record<string, number>) => void;
}

// The steppers are the chip's end caps: they take the chip's own corner, so a hover
// fill lands on the chip's shape instead of a rounded box inside a rounded corner.
const capClass =
  "w-6 text-xs leading-none transition-colors duration-150 hover:bg-accent hover:text-card disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-inherit";

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
  const on = weight > 0;
  return (
    // A floor under the short labels, so "Math" is not a stub beside "Creative writing".
    <span
      className={`inline-flex min-w-[7.5rem] items-stretch overflow-hidden rounded-md border text-sm ${
        on ? "border-accent text-accent-ink" : "border-line text-ink-2"
      }`}
    >
      <button
        type="button"
        aria-label={`Less ${metric.label}`}
        disabled={down[metric.name] === weight}
        onClick={() => onChange(down)}
        className={`${capClass} ${on ? "border-r border-accent" : "border-r border-line"}`}
      >
        &minus;
      </button>
      {/* Nothing here may change width with the state. The weight slot is always
          present, dimmed at zero, and the active chip gains no bold, because a wider
          chip slides the stepper out from under the pointer that just clicked it and
          takes every chip after it along. Border, fill, and ink carry the state. */}
      <span
        className={`flex flex-1 items-center justify-between gap-3 px-2 py-0.5 ${on ? "bg-accent-soft" : ""}`}
      >
        {metric.label}
        <span className={`tnum w-[1ch] text-right text-xs ${on ? "" : "text-ink-3"}`}>{weight}</span>
      </span>
      <button
        type="button"
        aria-label={`More ${metric.label}`}
        disabled={up[metric.name] === weight}
        onClick={() => onChange(up)}
        className={`${capClass} ${on ? "border-l border-accent" : "border-l border-line"}`}
      >
        +
      </button>
    </span>
  );
};

const BlendEditor = ({ metrics, weights, tip, onChange }: BlendEditorProps) => {
  if (metrics.length < 2) return null;
  // The mix is spoken in the decision line, not here: the order belongs in the sentence
  // that says what you are looking at, and saying it twice says it worse.
  return (
    <section aria-label="Score blend">
      <div className="flex flex-wrap items-center gap-1.5">
        {metrics.map((metric) => (
          <BlendChip
            key={metric.name}
            metric={metric}
            weight={weights[metric.name] ?? 0}
            weights={weights}
            onChange={onChange}
          />
        ))}
        {/* Hangs from its right edge: this trigger sits at the end of the row, and a
            left-hung tip runs off the viewport. */}
        <InfoHover label="About these categories" tip={tip} align="right" />
      </div>
    </section>
  );
};

export { BlendEditor };
