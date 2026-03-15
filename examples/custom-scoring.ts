import {
  fromModelsDev,
  recommend,
  costEfficiency,
  contextCapacity,
  recency,
  type ScoringCriterion,
  type PurposeProfile,
} from "pickai";

const models = await fromModelsDev();

// Write a custom criterion: prefer models with vision
const supportsVision: ScoringCriterion = (model) => {
  return model.modalities.input.includes("image") ? 1 : 0;
};

// Build a custom profile with your criterion + built-in ones
const profile: PurposeProfile = {
  filter: { toolCall: true },
  criteria: [
    { criterion: supportsVision, weight: 5 },
    { criterion: recency, weight: 3 },
    { criterion: contextCapacity, weight: 2 },
    { criterion: costEfficiency, weight: 1 },
  ],
};

const results = recommend(models, profile, { limit: 5 });

for (const model of results) {
  console.log(`${model.score.toFixed(3)} | ${model.name}`);
}
