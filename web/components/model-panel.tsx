// Everything about one model, opened from its row: the description, the score
// broken out by category, what the model can do, its limits and prices, and who
// it is. No seller list: this is not a place to find a deal.

import { capabilities, steeringSentence } from "@/core/model-detail";
import type { Say } from "@/core/model-detail";
import { formatCutoff, formatPrice, formatReleased, formatTokens } from "@/core/format";
import { fillPercent } from "@/core/score-view";
import type { Metric, ScoredRow } from "@/core/score-view";
import type { MetricRating } from "pickai";

interface ModelPanelProps {
  row: ScoredRow;
  /** The metrics the current source publishes, in display order. */
  metrics: Metric[];
  /** Each metric's places and how many models the source measured in it. */
  ranks: Record<string, { places: Record<string, number>; measured: number }>;
  /** One scale for every metric; null when nothing is rated. */
  scale: { min: number; max: number } | null;
  sourceName: string | null;
  measuredAt: string | null;
}

const counted = (n: number): string => n.toLocaleString("en-US");

const Unknown = ({ label }: { label: string }) => (
  <span className="hatch inline-block rounded-sm px-1.5 py-0.5 text-xs text-ink-2">{label}</span>
);

const fact = <T,>(value: T | null, render: (value: T) => string, unknownLabel: string) =>
  value === null ? <Unknown label={unknownLabel} /> : render(value);

const Block = ({
  heading,
  children,
  className = "",
}: {
  heading: string;
  children: React.ReactNode;
  className?: string;
}) => (
  <div className={`min-w-0 ${className}`}>
    <h4 className="mb-2 text-[11px] font-medium tracking-wider text-ink-3 uppercase">{heading}</h4>
    {children}
  </div>
);

// One rule in every block: label left, value right. A mix of left-aligned prose
// and right-aligned numbers in the same list reads ragged.
const Facts = ({ rows }: { rows: [string, React.ReactNode][] }) => (
  <dl className="grid grid-cols-[auto_1fr] items-baseline gap-x-4 gap-y-1">
    {rows.map(([label, value]) => (
      <div key={label} className="col-span-2 grid grid-cols-subgrid">
        <dt className="text-[13px] text-ink-3">{label}</dt>
        <dd className="tnum text-right text-[13px]">{value}</dd>
      </div>
    ))}
  </dl>
);

// Lit means the source said yes, struck through means it said no, and a dashed
// outline means it never said. A rule cuts on a stated no and never on silence.
const PILL_BY_SAY: Record<Say, string> = {
  yes: "border-accent bg-accent-soft text-accent-ink",
  no: "border-line-2 text-ink-3 line-through decoration-1",
  unstated: "border-line-2 border-dashed text-ink-3",
};

const MetricLine = ({
  metric,
  rating,
  place,
  measured,
  scale,
  lead,
}: {
  metric: Metric;
  rating: MetricRating;
  place: number;
  measured: number;
  scale: { min: number; max: number };
  lead: boolean;
}) => (
  <div className="grid grid-cols-[8.5rem_3rem_minmax(50px,1fr)_5rem_5.5rem] items-center gap-2.5 border-b border-line py-1 last:border-b-0">
    <span className={`text-[13px] ${lead ? "text-accent-ink" : "text-ink-2"}`}>{metric.label}</span>
    <span className={`tnum text-right font-medium ${lead ? "text-accent-ink" : ""}`}>
      {Math.round(rating.best)}
    </span>
    <span
      aria-hidden
      className="h-3.5 w-full overflow-hidden rounded-[3px] border border-line bg-bench"
    >
      <span
        className="block h-full bg-accent"
        style={{ width: `${fillPercent(rating.best, scale)}%` }}
      />
    </span>
    <span className="tnum text-right text-xs text-ink-2">
      #{place} of {counted(measured)}
    </span>
    <span className="tnum truncate text-xs text-ink-3">
      {rating.votes === undefined ? "" : `${counted(rating.votes)} votes`}
    </span>
  </div>
);

// The note exists to show a rival-config spread; identically rated rivals have none.
const rivalRating = (ratings: Record<string, MetricRating>): MetricRating | undefined =>
  Object.values(ratings).find((rating) => rating.configs > 1 && rating.min !== rating.max);

const ScoreBlock = ({ row, metrics, ranks, scale, sourceName, measuredAt }: ModelPanelProps) => {
  const heading =
    sourceName === null
      ? "How it scored"
      : `How it scored · ${sourceName}${measuredAt === null ? "" : `, measured ${measuredAt}`}`;

  if (row.ratings === undefined || scale === null) {
    return (
      <Block heading="How it scored" className="lg:row-span-2">
        <p className="text-[13px] text-ink-3">
          {sourceName ?? "This source"} has no measured score for this model. Absent data ranks
          nowhere.
        </p>
      </Block>
    );
  }

  const ratings = row.ratings;
  const shown = metrics.filter(({ name }) => ratings[name] !== undefined);
  const rival = rivalRating(ratings);

  return (
    <Block heading={heading} className="lg:row-span-2">
      {shown.map((metric) => (
        <MetricLine
          key={metric.name}
          metric={metric}
          rating={ratings[metric.name]}
          place={ranks[metric.name]?.places[row.key] ?? 0}
          measured={ranks[metric.name]?.measured ?? 0}
          scale={scale}
          lead={metric === shown[0]}
        />
      ))}
      <p className="mt-2 max-w-[62ch] text-xs text-ink-3">
        Every bar runs from {Math.round(scale.min)}, the lowest score {sourceName ?? "this source"}{" "}
        has measured in any category, to {Math.round(scale.max)}, the highest. One scale for all of
        them, so the lengths compare. Places are among the models measured in that category.
      </p>
      {rival !== undefined && (
        <p className="mt-2 max-w-[62ch] text-xs text-ink-3">
          {rival.configs} configurations of this model are rated separately, {Math.round(rival.min)}{" "}
          to {Math.round(rival.max)}. The best is {rival.bestConfig}, and that is the one scored
          here.
        </p>
      )}
    </Block>
  );
};

const modalityList = (list: string[]): string =>
  list.map((name) => name.charAt(0).toUpperCase() + name.slice(1)).join(", ");

const CapabilityBlock = ({ row }: { row: ScoredRow }) => {
  const caps = capabilities(row.capabilityValues);
  const steering = steeringSentence(row.reasoningOptions);
  const anySilent = caps.some(({ say }) => say === "unstated");
  return (
    <Block heading="What it can do">
      <div className="flex flex-wrap gap-1.5">
        {caps.map(({ name, label, say }) => (
          <span
            key={name}
            className={`rounded-full border px-2.5 py-0.5 text-xs ${PILL_BY_SAY[say]}`}
            title={say === "unstated" ? "The catalog does not say either way" : undefined}
          >
            {label}
          </span>
        ))}
      </div>
      {steering !== null && <p className="mt-2 text-[13px] text-ink-2">{steering}</p>}
      {anySilent && (
        <p className="mt-2 max-w-[46ch] text-xs text-ink-3">
          A dashed outline means the catalog never said either way, which is not the same as a no. A
          rule never cuts a model for silence.
        </p>
      )}
      <div className="mt-2">
        <Facts
          rows={[
            ["Takes in", modalityList(row.modalitiesIn)],
            ["Gives back", modalityList(row.modalitiesOut)],
          ]}
        />
      </div>
    </Block>
  );
};

const perMillion = (value: number): string => `${formatPrice(value)} /M`;

const ModelPanel = (props: ModelPanelProps) => {
  const { row } = props;
  return (
    <div className="grid grid-cols-1 gap-x-8 gap-y-5 px-5 pt-4 pb-5 md:grid-cols-2 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)_minmax(0,1fr)]">
      <p className="col-span-full m-0 max-w-[90ch] text-sm text-ink-2">
        {row.about ?? <span className="text-ink-3">The catalog publishes no description.</span>}
      </p>
      {row.deprecated && (
        <p className="col-span-full m-0">
          <span className="hatch inline-block rounded border border-line-2 px-2 py-0.5 text-xs">
            Deprecated. The seller has marked this model for retirement.
          </span>
        </p>
      )}
      <ScoreBlock {...props} />
      <CapabilityBlock row={row} />
      <Block heading="Limits and prices">
        <Facts
          rows={[
            ["Context", fact(row.context, formatTokens, "unknown")],
            ["Max output", fact(row.output, formatTokens, "unknown")],
            ["Input", fact(row.costIn, perMillion, "unknown")],
            ["Output", fact(row.costOut, perMillion, "unknown")],
            ["Cache read", fact(row.cacheRead, perMillion, "unknown")],
            ["Cache write", fact(row.cacheWrite, perMillion, "unknown")],
          ]}
        />
      </Block>
      <Block heading="Identity and dates">
        <Facts
          rows={[
            ["Maker", fact(row.maker, (maker) => maker, "unknown")],
            ["Family", fact(row.family, (family) => family, "unknown")],
            ["Model id", row.key],
            ["Released", fact(row.released, formatReleased, "unknown")],
            ["Knowledge cutoff", fact(row.cutoff, formatCutoff, "unknown")],
            ["Catalog updated", fact(row.updated, formatReleased, "unknown")],
            ["Providers", counted(row.sellerCount)],
          ]}
        />
      </Block>
    </div>
  );
};

export { ModelPanel };
