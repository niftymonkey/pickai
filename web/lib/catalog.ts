import { fromModelsDev } from "pickai";

/**
 * The trimmed, serializable model shape the UI works with. Flat fields keep
 * table code simple and the client payload small.
 */
export interface UiModel {
  /** Unique across resellers: "provider/model-id" */
  key: string;
  id: string;
  name: string;
  provider: string;
  /** USD per 1M tokens. Absent means unknown pricing, never free. */
  costIn?: number;
  costOut?: number;
  context: number;
  output: number;
  inputModalities: string[];
  reasoning: boolean;
  toolCall: boolean;
  structuredOutput: boolean;
  openWeights: boolean;
  /** Model family: "claude", "gpt", "gemini" */
  family?: string;
  /** Knowledge cutoff: "2025-03" */
  knowledge?: string;
  /** Release date: "2025-09-29" */
  releaseDate?: string;
}

let cached: Promise<UiModel[]> | undefined;

/** Fetch the models.dev catalog once per server process. */
export function loadCatalog(): Promise<UiModel[]> {
  cached ??= load();
  return cached;
}

async function load(): Promise<UiModel[]> {
  const models = await fromModelsDev();
  return models
    .filter((m) => m.status !== "deprecated")
    .map((m) => ({
      key: `${m.provider}/${m.id}`,
      id: m.id,
      name: m.name,
      provider: m.provider,
      costIn: m.cost?.input,
      costOut: m.cost?.output,
      context: m.limit.context,
      output: m.limit.output,
      inputModalities: m.modalities.input,
      reasoning: m.reasoning === true,
      toolCall: m.toolCall === true,
      structuredOutput: m.structuredOutput === true,
      openWeights: m.openWeights === true,
      family: m.family,
      knowledge: m.knowledge,
      releaseDate: m.releaseDate,
    }));
}
