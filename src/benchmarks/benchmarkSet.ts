// The shape every benchmark source resolves to, wherever the numbers came from.

/** One measured number, with the bounds and vote count the source published. */
interface MetricValue {
  value: number;
  low?: number;
  high?: number;
  votes?: number;
}

/** One rated thing, named as the source names it: a model, or one configuration of it. */
interface BenchmarkScore {
  modelId: string;
  /** Who built the model, when the source says so; the join may fill an unknown maker from it. */
  maker?: string;
  license?: string;
  metrics: Record<string, MetricValue>;
}

/** `source` and `measuredAt` are required: a number without provenance is not usable (rule 2). */
interface BenchmarkSet {
  source: string;
  measuredAt: string;
  license?: string;
  scores: BenchmarkScore[];
}

export type { MetricValue, BenchmarkScore, BenchmarkSet };
