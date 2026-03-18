/**
 * Triangulating Quality from Multiple Benchmark Sources
 *
 * No single benchmark tells the whole story. Arena scores reflect what
 * people prefer in conversation; objective benchmarks measure raw task
 * performance. A model can score well on standardized tests but feel
 * robotic, or charm users while fumbling at structured tasks.
 *
 * This example combines two independent quality signals -- LMArena
 * human preference and Artificial Analysis intelligence index -- so
 * models that rank highly on both rise to the top. Cost and recency
 * act as tiebreakers.
 *
 * Requires ARTIFICIAL_ANALYSIS_API_KEY for AA data. LMArena is free.
 */

import {
  fromModelsDev, recommend,
  minMaxCriterion, matchesModel,
  costEfficiency, recency,
  perProvider, perFamily,
  DIRECT_PROVIDERS,
} from "pickai";

const aaKey = process.env.ARTIFICIAL_ANALYSIS_API_KEY;
if (!aaKey) {
  console.error("Set ARTIFICIAL_ANALYSIS_API_KEY to run this example.");
  process.exit(1);
}

const models = await fromModelsDev();

// --- Source 1: LMArena (human preference from blind comparisons) ---

const lmResponse = await fetch(
  "https://raw.githubusercontent.com/nakasyou/lmarena-history/main/output/scores.json",
);
if (!lmResponse.ok) throw new Error(`LMArena fetch failed: ${lmResponse.status}`);
const scoresData = await lmResponse.json();
const dates = Object.keys(scoresData).sort();
const latestScores = scoresData[dates[dates.length - 1]].text.overall;
const arenaBenchmarks = Object.entries(latestScores).map(([modelId, score]) => ({
  modelId,
  score: score as number,
}));

// --- Source 2: Artificial Analysis (objective benchmark composite) ---

const aaResponse = await fetch(
  "https://artificialanalysis.ai/api/v2/data/llms/models",
  { headers: { "x-api-key": aaKey } },
);
if (!aaResponse.ok) throw new Error(`AA fetch failed: ${aaResponse.status}`);
const aaData = await aaResponse.json();
const aaBenchmarks = aaData.data
  .filter((m: Record<string, unknown>) => m.evaluations)
  .map((m: Record<string, unknown>) => {
    const evals = m.evaluations as Record<string, number | null>;
    return {
      slug: m.slug as string,
      quality: evals.artificial_analysis_intelligence_index ?? undefined,
    };
  });

// Enrich models with both benchmark values so they flow through to results.
// ScoredModel is generic -- recommend() preserves any extra fields you add.
const enriched = models.map((m) => {
  const arena = arenaBenchmarks.find((b) => matchesModel(b.modelId, m.id));
  const aa = aaBenchmarks.find((b: { slug: string }) => matchesModel(b.slug, m.id));
  return {
    ...m,
    arena: arena ? Math.round(arena.score) : undefined,
    quality: aa?.quality,
  };
});

// Each benchmark source becomes one criterion. Not every model appears in
// both datasets -- minMaxCriterion scores unmatched models as 0, so models
// with data from both sources naturally rank higher.

const humanPreference = minMaxCriterion((model) => {
  const match = arenaBenchmarks.find((b) => matchesModel(b.modelId, model.id));
  return match?.score;
});

const objectiveQuality = minMaxCriterion((model) => {
  const match = aaBenchmarks.find((b: { slug: string }) =>
    matchesModel(b.slug, model.id),
  );
  return match?.quality;
});

// Blend human preference and objective quality equally, with cost and
// recency as tiebreakers. Top 10, diverse across providers and families.
const results = recommend(enriched, {
  criteria: [
    { criterion: humanPreference, weight: 4 },
    { criterion: objectiveQuality, weight: 4 },
    { criterion: costEfficiency, weight: 2 },
    { criterion: recency, weight: 1 },
  ],
}, {
  filter: { providers: [...DIRECT_PROVIDERS] },
  constraints: [perProvider(2), perFamily(1)],
  limit: 10,
});

console.table(results.map((m) => ({
  Score: +m.score.toFixed(3),
  Model: m.name,
  Provider: m.provider,
  Arena: m.arena ?? "n/a",
  Quality: m.quality ?? "n/a",
  Cost: m.cost?.input != null ? `$${m.cost.input}/M` : "n/a",
})));
