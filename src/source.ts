/**
 * Data source functions for pickai.
 *
 * Data source functions for loading model catalogs.
 * fromModelsDev() fetches from models.dev/api.json.
 */

import type { Model, ModelCost, ModelLimit, ModelModalities } from "./types";
import { deriveOpenRouterId } from "./id";

// ---------------------------------------------------------------------------
// models.dev API types (as returned by the API)
// ---------------------------------------------------------------------------

interface ModelsDevCostRaw {
  input?: number;
  output?: number;
  cache_read?: number;
  cache_write?: number;
}

interface ModelsDevLimitRaw {
  context?: number;
  output?: number;
}

interface ModelsDevModalitiesRaw {
  input?: string[];
  output?: string[];
}

interface ModelsDevModelRaw {
  name?: string;
  description?: string;
  cost?: ModelsDevCostRaw;
  limit?: ModelsDevLimitRaw;
  modalities?: ModelsDevModalitiesRaw;
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
  const rawCost = raw.cost;
  const cost: ModelCost | undefined =
    rawCost && (rawCost.input != null || rawCost.output != null)
      ? {
          input: rawCost.input ?? 0,
          output: rawCost.output ?? 0,
          ...(rawCost.cache_read != null && { cacheRead: rawCost.cache_read }),
          ...(rawCost.cache_write != null && { cacheWrite: rawCost.cache_write }),
        }
      : undefined;

  const rawLimit = raw.limit;
  const limit: ModelLimit = {
    context: rawLimit?.context ?? 0,
    output: rawLimit?.output ?? 0,
  };

  const rawModalities = raw.modalities;
  const modalities: ModelModalities = {
    input: rawModalities?.input ?? ["text"],
    output: rawModalities?.output ?? ["text"],
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
 * Fetch and parse model data from models.dev.
 *
 * - `fromModelsDev()`: fetches from models.dev/api.json
 * - `fromModelsDev(data)`: uses pre-fetched data (testing, offline, caching)
 */
export async function fromModelsDev(prefetchedData?: ModelsDevData): Promise<Model[]> {
  if (prefetchedData) {
    return parseModelsDevData(prefetchedData);
  }

  const response = await fetch(MODELS_DEV_URL);
  if (!response.ok) {
    throw new Error(`models.dev fetch failed: ${response.status} ${response.statusText}`);
  }
  const data: ModelsDevData = await response.json();
  return parseModelsDevData(data);
}
