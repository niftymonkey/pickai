/**
 * Benchmark Scoring: Combining a Purpose Profile with LMArena Data
 *
 * Built-in purpose profiles score on metadata (cost, context, recency),
 * which are useful proxies but don't measure actual model quality. This
 * example shows how to layer benchmark data on top of a built-in purpose
 * to get the best of both: metadata-driven filtering and weighting from
 * the purpose, plus real-world quality signal from arena scores.
 *
 * LMArena data is free and requires no API key.
 */

import {
  fromModelsDev, recommend,
  minMaxCriterion, matchesModel,
  Purpose,
  DIRECT_PROVIDERS,
  type PurposeProfile,
} from "pickai";

const models = await fromModelsDev();

// LMArena / Chatbot Arena (free, no key required, ~10MB download).
// This data updates daily; consider caching locally.
const response = await fetch(
  "https://raw.githubusercontent.com/nakasyou/lmarena-history/main/output/scores.json",
);
const scoresData = await response.json();
const dates = Object.keys(scoresData).sort();
const latestScores = scoresData[dates[dates.length - 1]].text.overall;

// Build a lookup array we can match against pickai model IDs
const benchmarks = Object.entries(latestScores).map(([modelId, score]) => ({
  modelId,
  score: score as number,
}));

// Create a criterion from benchmark data using minMaxCriterion
const arenaScore = minMaxCriterion((model) => {
  const match = benchmarks.find((b) => matchesModel(b.modelId, model.id));
  return match?.score;
});

// Take a built-in purpose and layer arena score on top
const base = Purpose.Coding;

const CodingWithArena: PurposeProfile = {
  filter: base.filter,
  criteria: [
    ...base.criteria,
    { criterion: arenaScore, weight: 6 }, // Coding weights sum to 13, so 6 makes arena ~30% of total
  ],
};

const results = recommend(models, CodingWithArena, {
  filter: { providers: [...DIRECT_PROVIDERS] },
  limit: 5,
});

// ScoredModel contains the blended composite score but not individual criterion
// values. To display the raw arena number let's just look it up from the original data.
for (const m of results) {
  const match = benchmarks.find((b) => matchesModel(b.modelId, m.id));
  const arena = match ? Math.round(match.score) : "n/a";
  console.log(`  ${m.score.toFixed(3)} | ${m.name} (${m.provider}) | arena: ${arena}`);
}
