import { fromModelsDev, find } from "pickai";

const models = await fromModelsDev();

// Declarative filter: affordable Anthropic models with tool calling
const results = find(models, {
  filter: {
    providers: ["anthropic"],
    toolCall: true,
    maxCostInput: 5,
  },
  limit: 5,
});

for (const model of results) {
  console.log(`${model.name} | $${model.cost?.input}/M input`);
}

// Predicate filter: multimodal models that also support reasoning
const reasoningVision = find(models, {
  filter: (m) => m.reasoning === true && m.modalities.input.includes("image"),
  limit: 5,
});

for (const model of reasoningVision) {
  console.log(`${model.name} (${model.provider})`);
}
