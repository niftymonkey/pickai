/**
 * Human Preference Scoring with LMArena
 *
 * LMArena (formerly Chatbot Arena) ranks models based on crowdsourced
 * blind comparisons: real users chat with two anonymous models side by
 * side and vote for the response they prefer. The resulting ELO-style
 * scores reflect what people actually like, which can differ from what
 * performs best on standardized benchmarks.
 *
 * This example uses arena scores as the primary signal for picking a
 * conversational model, with cost and recency as secondary factors.
 *
 * LMArena data is free and requires no API key.
 * See aa-benchmarks.ts for objective benchmark scoring via Artificial Analysis.
 */

import {
  fromModelsDev, recommend,
  minMaxCriterion, matchesModel,
  costEfficiency, recency,
  perProvider, perFamily,
  DIRECT_PROVIDERS,
  type Model,
} from "pickai";

const models = await fromModelsDev();

// LMArena scores (free, no key required, ~10MB download).
// This data updates daily; consider caching locally.
const response = await fetch(
  "https://raw.githubusercontent.com/nakasyou/lmarena-history/main/output/scores.json",
);
if (!response.ok) throw new Error(`LMArena fetch failed: ${response.status}`);
const scoresData = await response.json();
const dates = Object.keys(scoresData).sort();
const latestScores = scoresData[dates[dates.length - 1]].text.overall;

// We're pulling just the overall text score here, but the LMArena dataset
// includes category-specific scores (coding, math, etc.) you could use instead.
const benchmarks = Object.entries(latestScores).map(([modelId, score]) => ({
  modelId,
  score: score as number,
}));

// Enrich models with arena scores so they flow through to results.
// ScoredModel is generic -- recommend() preserves any extra fields you add.
type ArenaModel = Model & { arena?: number };
const enriched: ArenaModel[] = models.map((m) => {
  const match = benchmarks.find((b) => matchesModel(b.modelId, m.id));
  return { ...m, arena: match?.score };
});

// Human preference is the primary signal
const humanPreference = minMaxCriterion((model: ArenaModel) => model.arena);

// Rank by human preference (arena), with cost and recency as secondary signals.
// Top 10 from direct providers, spread across providers and families.
const results = recommend(enriched, {
  criteria: [
    { criterion: humanPreference, weight: 5 },
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
  Arena: m.arena != null ? Math.round(m.arena) : "n/a",
  Cost: m.cost?.input != null ? `$${m.cost.input}/M` : "n/a",
})));
