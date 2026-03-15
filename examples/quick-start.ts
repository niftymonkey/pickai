import { fromModelsDev, find, recommend, Purpose } from "pickai";

const models = await fromModelsDev();

// Latest 5 OpenAI models
const openai = find(models, { filter: { providers: ["openai"] }, limit: 5 });
// Top-scored for coding from that list
const [top] = recommend(openai, Purpose.Coding);
