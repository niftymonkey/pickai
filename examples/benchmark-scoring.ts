/**
 * Benchmark Scoring: Using LMArena Quality Data
 *
 * Built-in profiles score on metadata (cost, context, recency), which
 * are useful proxies but don't measure actual model quality. This example
 * shows how to bring benchmark data as a custom scoring criterion using
 * LMArena (Chatbot Arena) scores.
 *
 * LMArena data is free and requires no API key.
 */

import {
  fromModelsDev, recommend,
  matchesModel, minMaxCriterion,
  costEfficiency, contextCapacity,
  DIRECT_PROVIDERS, type PurposeProfile,
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

// Map to a simple array for easy lookup
const benchmarks = Object.entries(latestScores).map(([modelId, score]) => ({
  modelId,
  score: score as number,
}));

// Create a criterion from benchmark data using minMaxCriterion
const arenaScore = minMaxCriterion((model) => {
  const match = benchmarks.find((b) => matchesModel(b.modelId, model.id));
  return match?.score;
});

// Build a profile that weighs arena score heavily, with cost as a tiebreaker
const ArenaLeader: PurposeProfile = {
  criteria: [
    { criterion: arenaScore, weight: 5 },
    { criterion: contextCapacity, weight: 2 },
    { criterion: costEfficiency, weight: 1 },
  ],
};

const results = recommend(models, ArenaLeader, {
  filter: { providers: [...DIRECT_PROVIDERS] },
  limit: 5,
});

for (const m of results) {
  const match = benchmarks.find((b) => matchesModel(b.modelId, m.id));
  const arena = match ? Math.round(match.score) : "n/a";
  console.log(`  ${m.score.toFixed(3)} | ${m.name} (${m.provider}) | arena: ${arena}`);
}
