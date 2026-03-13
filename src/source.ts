/**
 * Data source functions for pickai.
 *
 * A source is a thunk `() => Promise<Model[]>` that createPicker calls once.
 * modelsDev() is the built-in source backed by models.dev.
 */

import type { Model, ModelCost, ModelLimit, ModelModalities } from "./types";
import { deriveOpenRouterId } from "./id";

// ---------------------------------------------------------------------------
// models.dev API types (snake_case as returned by the API)
// ---------------------------------------------------------------------------

interface ModelsDevModelRaw {
  name?: string;
  description?: string;
  input_cost?: number;
  output_cost?: number;
  cache_read?: number;
  cache_write?: number;
  context?: number;
  max_output?: number;
  input?: string[];
  output?: string[];
  reasoning?: boolean;
  tool_call?: boolean;
  structured_output?: boolean;
  open_weights?: boolean;
  attachment?: boolean;
  family?: string;
  knowledge?: string;
  release_date?: string;
  last_updated?: string;
  status?: string;
}

interface ModelsDevProviderRaw {
  name?: string;
  npm?: string;
  models?: Record<string, ModelsDevModelRaw>;
}

/** The shape of the models.dev /api.json response. */
export type ModelsDevData = Record<string, ModelsDevProviderRaw>;

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

function parseModel(
  modelId: string,
  raw: ModelsDevModelRaw,
  providerId: string,
  sdk: string | undefined,
): Model {
  const cost: ModelCost | undefined =
    raw.input_cost != null || raw.output_cost != null
      ? {
          input: raw.input_cost ?? 0,
          output: raw.output_cost ?? 0,
          ...(raw.cache_read != null && { cacheRead: raw.cache_read }),
          ...(raw.cache_write != null && { cacheWrite: raw.cache_write }),
        }
      : undefined;

  const limit: ModelLimit = {
    context: raw.context ?? 0,
    output: raw.max_output ?? 0,
  };

  const modalities: ModelModalities = {
    input: raw.input ?? ["text"],
    output: raw.output ?? ["text"],
  };

  return {
    id: modelId,
    name: raw.name ?? modelId,
    provider: providerId,
    openRouterId: deriveOpenRouterId(providerId, modelId),
    ...(raw.description != null && { description: raw.description }),
    cost,
    limit,
    modalities,
    ...(raw.reasoning != null && { reasoning: raw.reasoning }),
    ...(raw.tool_call != null && { toolCall: raw.tool_call }),
    ...(raw.structured_output != null && { structuredOutput: raw.structured_output }),
    ...(raw.open_weights != null && { openWeights: raw.open_weights }),
    ...(raw.attachment != null && { attachment: raw.attachment }),
    ...(raw.family != null && { family: raw.family }),
    ...(raw.knowledge != null && { knowledge: raw.knowledge }),
    ...(raw.release_date != null && { releaseDate: raw.release_date }),
    ...(raw.last_updated != null && { lastUpdated: raw.last_updated }),
    ...(raw.status != null && { status: raw.status }),
    ...(sdk != null && { sdk }),
  };
}

/** Parse a full models.dev data blob into Model[]. */
export function parseModelsDevData(data: ModelsDevData): Model[] {
  const models: Model[] = [];
  for (const [providerId, provider] of Object.entries(data)) {
    if (!provider.models) continue;
    const sdk = provider.npm;
    for (const [modelId, raw] of Object.entries(provider.models)) {
      models.push(parseModel(modelId, raw, providerId, sdk));
    }
  }
  return models;
}

// ---------------------------------------------------------------------------
// Source function
// ---------------------------------------------------------------------------

const MODELS_DEV_URL = "https://models.dev/api.json";

/**
 * Create a models.dev source function.
 *
 * - `fromModelsDev()` — fetches from models.dev at picker creation time
 * - `fromModelsDev(data)` — uses pre-fetched data (testing, offline, caching)
 */
export function fromModelsDev(prefetchedData?: ModelsDevData): () => Promise<Model[]> {
  if (prefetchedData) {
    return () => Promise.resolve(parseModelsDevData(prefetchedData));
  }

  return async () => {
    const response = await fetch(MODELS_DEV_URL);
    if (!response.ok) {
      throw new Error(`models.dev fetch failed: ${response.status} ${response.statusText}`);
    }
    const data: ModelsDevData = await response.json();
    return parseModelsDevData(data);
  };
}
