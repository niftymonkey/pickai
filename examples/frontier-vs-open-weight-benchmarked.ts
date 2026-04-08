// Open vs. Closed (Benchmarked) -- compare open and closed models using AA quality data.

import {
  fromModelsDev, recommend,
  minMaxCriterion, matchesModel,
  costEfficiency, recency,
  ALL_KNOWN_PROVIDERS,
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

// The intelligence index composites scores across standardized benchmarks
// (MMLU, GPQA, HumanEval, etc.) into a single quality number per model.
// AA also exposes category-specific scores (coding_index, math_index) you
// could use instead if your use case is narrower.
const benchmarks = aaData.data
  .filter((m: Record<string, unknown>) => m.evaluations)
  .map((m: Record<string, unknown>) => {
    const evals = m.evaluations as Record<string, number | null>;
    return {
      slug: m.slug as string,
      quality: evals.artificial_analysis_intelligence_index ?? undefined,
    };
  });

// Enrich models with quality scores so they flow through to results
type QualityModel = Model & { quality?: number };
const qualityModels: QualityModel[] = models.map((m) => {
  const match = benchmarks.find((b: { slug: string }) =>
    matchesModel(b.slug, m.id),
  );
  return { ...m, quality: match?.quality };
});

// Quality is the primary signal -- this is what the metadata-only version lacks
const qualityScore = minMaxCriterion((model: QualityModel) => model.quality);

const qualityProfile = {
  criteria: [
    { criterion: qualityScore, weight: 5 },
    { criterion: costEfficiency, weight: 2 },
    { criterion: recency, weight: 1 },
  ],
};

// Score all models together so scores are on the same scale
const all = recommend(qualityModels, qualityProfile, {
  filter: { providers: [...ALL_KNOWN_PROVIDERS] },
  limit: 100,
});

// Split the results by open-weight vs frontier
const topOpen = all.filter((m) => m.openWeights).slice(0, 5);
const topFrontier = all.filter((m) => !m.openWeights).slice(0, 5);

const format = (rows: typeof topOpen) =>
  rows.map((m) => ({
    Score: +m.score.toFixed(3),
    Model: m.name,
    Provider: m.provider,
    Quality: m.quality ?? "n/a",
    Cost: m.cost?.input != null ? `$${m.cost.input}/M` : "n/a",
  }));

console.log("--- Top 5 Frontier ---");
console.table(format(topFrontier));

console.log("--- Top 5 Open-Weight ---");
console.table(format(topOpen));

// Compare the gap using benchmark-backed scores
const gap = topFrontier[0].score - topOpen[0].score;
console.log(`Gap: ${(gap * 100).toFixed(1)}% score difference between top frontier and top open-weight`);
