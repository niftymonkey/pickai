import { createPicker, fromModelsDev } from "pickai";

const pick = await createPicker(fromModelsDev());

// Declarative filter: Anthropic models with tool calling under $5/M input tokens
const anthropicTools = pick.find({
  filter: {
    providers: ["anthropic"],
    toolCall: true,
    maxCostInput: 5,
  },
  limit: 5,
});

for (const model of anthropicTools) {
  console.log(`${model.id} — $${model.cost?.input}/M input`);
}

// Predicate filter: custom logic for exact requirements
const large = pick.find({
  filter: (model) => model.limit.context >= 200_000 && model.reasoning === true,
  sort: "costAsc",
});

console.log("Large reasoning models:", large.map((m) => m.id));
