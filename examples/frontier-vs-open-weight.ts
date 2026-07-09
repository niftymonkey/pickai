// Open vs. Closed -- compare frontier and open-weight models on the same scale.

import {
  fromModelsDev, recommend,
  Purpose, ALL_KNOWN_PROVIDERS,
  type ScoredModel,
} from "pickai";

const models = await fromModelsDev();

// Score all models together so scores are on the same scale
const all = recommend(models, Purpose.Coding, {
  filter: { providers: [...ALL_KNOWN_PROVIDERS] },
  limit: 100,
});

// Split the results by open-weight vs frontier
const topOpen = all.filter((m) => m.openWeights).slice(0, 3);
const topFrontier = all.filter((m) => !m.openWeights).slice(0, 3);

const format = (m: ScoredModel) => {
  const tag = m.openWeights ? "open-weight" : "frontier";
  return `  ${m.score.toFixed(3)} | ${m.name} (${m.provider}, ${tag})`;
};

console.log("--- Top 3 Frontier ---");
for (const m of topFrontier) console.log(format(m));

console.log("\n--- Top 3 Open-Weight ---");
for (const m of topOpen) console.log(format(m));

// Compare the gap
const gap = topFrontier[0].score - topOpen[0].score;
console.log(`\nGap: ${(gap * 100).toFixed(1)}% score difference between top frontier and top open-weight`);
