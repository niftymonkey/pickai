import { recommend, Purpose, type Model } from "pickai";

// Bring your own model data: useful for testing, offline use,
// or when you maintain your own model catalog
const models: Model[] = [
  {
    id: "claude-sonnet-4-5",
    name: "Claude Sonnet 4.5",
    provider: "anthropic",
    openRouterId: "anthropic/claude-sonnet-4.5",
    cost: { input: 3, output: 15 },
    limit: { context: 200_000, output: 16_384 },
    modalities: { input: ["text", "image"], output: ["text"] },
    reasoning: true,
    toolCall: true,
    structuredOutput: true,
    family: "claude-sonnet",
    releaseDate: "2025-02-24",
    knowledge: "2025-04",
  },
  {
    id: "gpt-4o",
    name: "GPT-4o",
    provider: "openai",
    openRouterId: "openai/gpt-4o",
    cost: { input: 2.5, output: 10 },
    limit: { context: 128_000, output: 16_384 },
    modalities: { input: ["text", "image", "audio"], output: ["text"] },
    toolCall: true,
    structuredOutput: true,
    family: "gpt",
    releaseDate: "2024-05-13",
    knowledge: "2024-10",
  },
];

const results = recommend(models, Purpose.Coding);

for (const m of results) {
  console.log(`  ${m.score.toFixed(3)} | ${m.name} (${m.provider})`);
}
