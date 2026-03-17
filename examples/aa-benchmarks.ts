/**
 * Smartest Model for Your Budget with Artificial Analysis
 *
 * Artificial Analysis maintains an intelligence index that composites
 * scores across standardized benchmarks (MMLU, GPQA, HumanEval, etc.)
 * into a single quality number per model. Unlike arena-style human
 * preference scores, this measures objective task performance.
 *
 * This example uses the intelligence index to find the highest-quality
 * models under a cost ceiling -- useful when you're building a
 * high-volume pipeline where cost matters but you don't want to
 * sacrifice intelligence.
 *
 * Requires an API key from artificialanalysis.ai (set ARTIFICIAL_ANALYSIS_API_KEY).
 * See lmarena-benchmarks.ts for a free alternative using human preference data.
 */

import {
  fromModelsDev, recommend,
  minMaxCriterion, matchesModel,
  costEfficiency,
  perProvider, perFamily,
  DIRECT_PROVIDERS,
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
      quality: evals.artificial_analysis_intelligence_index ?? 0,
    };
  });

// Enrich models with quality scores so they flow through to results.
// ScoredModel is generic -- recommend() preserves any extra fields you add.
const enriched = models.map((m) => {
  const match = benchmarks.find((b: { slug: string }) =>
    matchesModel(b.slug, m.id),
  );
  return { ...m, quality: match?.quality };
});

// AA Intelligence Index: composite quality score across multiple benchmarks
const qualityScore = minMaxCriterion((model) => {
  const match = benchmarks.find((b: { slug: string }) =>
    matchesModel(b.slug, model.id),
  );
  return match?.quality;
});

// Rank by intelligence index with cost as tiebreaker.
// Top 10 from direct providers, diverse across providers and families.
const results = recommend(enriched, {
  criteria: [
    { criterion: qualityScore, weight: 5 },
    { criterion: costEfficiency, weight: 2 },
  ],
}, {
  filter: { providers: [...DIRECT_PROVIDERS], maxCostInput: 3 },
  constraints: [perProvider(2), perFamily(1)],
  limit: 10,
});

console.table(results.map((m) => ({
  Score: +m.score.toFixed(3),
  Model: m.name,
  Provider: m.provider,
  Quality: m.quality ?? "n/a",
  Cost: m.cost?.input ? `$${m.cost.input}/M` : "n/a",
})));
