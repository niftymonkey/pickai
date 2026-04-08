// Objective Quality Ranking -- find the smartest model using Artificial Analysis benchmarks.

import {
  fromModelsDev, recommend,
  minMaxCriterion, matchesModel,
  costEfficiency,
  perProvider, perFamily,
  DIRECT_PROVIDERS,
  type Model,
} from "pickai";

const aaKey = process.env.ARTIFICIAL_ANALYSIS_API_KEY;
if (!aaKey) {
  console.error("Set ARTIFICIAL_ANALYSIS_API_KEY to run this example.");
  process.exit(1);
}

const models = await fromModelsDev();

// Fetch benchmark data from Artificial Analysis (requires API key)
const response = await fetch(
  "https://artificialanalysis.ai/api/v2/data/llms/models",
  { headers: { "x-api-key": aaKey } },
);
if (!response.ok) throw new Error(`AA fetch failed: ${response.status}`);
const aaData = await response.json();

// We're pulling just the intelligence index here, but the AA API also
// exposes individual benchmark scores (GPQA, IFBench, MMLU, etc.) you
// could use as separate criteria.
const benchmarks = aaData.data
  .filter((m: Record<string, unknown>) => m.evaluations)
  .map((m: Record<string, unknown>) => {
    const evals = m.evaluations as Record<string, number | null>;
    return {
      slug: m.slug as string,
      quality: evals.artificial_analysis_intelligence_index ?? undefined,
    };
  });

// Enrich models with quality scores so they flow through to results.
// ScoredModel is generic -- recommend() preserves any extra fields you add.
type BenchmarkedModel = Model & { quality?: number };
const benchmarkedModels: BenchmarkedModel[] = models.map((m) => {
  const match = benchmarks.find((b: { slug: string }) =>
    matchesModel(b.slug, m.id),
  );
  return { ...m, quality: match?.quality };
});

// AA Intelligence Index: composite quality score across multiple benchmarks
const qualityScore = minMaxCriterion((model: BenchmarkedModel) => model.quality);

// Rank by intelligence index with cost as tiebreaker
const qualityProfile = {
  criteria: [
    { criterion: qualityScore, weight: 5 },
    { criterion: costEfficiency, weight: 2 },
  ],
};

// Top 10 under $3/M from direct providers, diverse across providers and families
const selection = {
  filter: { providers: [...DIRECT_PROVIDERS], maxCostInput: 3 },
  constraints: [perProvider(2), perFamily(1)],
  limit: 10,
};

const results = recommend(benchmarkedModels, qualityProfile, selection);

console.table(results.map((m) => ({
  Score: +m.score.toFixed(3),
  Model: m.name,
  Provider: m.provider,
  Quality: m.quality ?? "n/a",
  Cost: m.cost?.input != null ? `$${m.cost.input}/M` : "n/a",
})));
