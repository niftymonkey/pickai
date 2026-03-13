import {
  createPicker,
  fromModelsDev,
  costEfficiency,
  contextCapacity,
  recency,
  type ScoringCriterion,
  type PurposeProfile,
} from "pickai";

const pick = await createPicker(fromModelsDev());

// Write a custom criterion: prefer models with image input
const multimodal: ScoringCriterion = (model) => {
  return model.modalities.input.includes("image") ? 1 : 0;
};

// Build a custom profile with your criterion + built-in ones
const profile: PurposeProfile = {
  filter: { toolCall: true },
  criteria: [
    { criterion: multimodal, weight: 5 },
    { criterion: recency, weight: 3 },
    { criterion: contextCapacity, weight: 2 },
    { criterion: costEfficiency, weight: 1 },
  ],
};

const results = pick.recommend(profile, { limit: 5 });

for (const model of results) {
  console.log(`${model.id} — score: ${model.score.toFixed(3)}`);
}
