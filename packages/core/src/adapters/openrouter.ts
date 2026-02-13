/**
 * OpenRouter API adapter
 *
 * Converts raw OpenRouter model objects into pickai's normalized Model format.
 * Pulled forward from Phase 4 to support real-data test fixtures.
 */

import type { Model } from "../types";
import { normalizeModelId, extractDirectModelId } from "../id";

/**
 * Raw model shape from the OpenRouter /api/v1/models endpoint.
 */
export interface OpenRouterModel {
  id: string;
  name: string;
  created: number;
  context_length: number;
  architecture: {
    modality: string;
    input_modalities: string[];
    output_modalities: string[];
    tokenizer: string;
    instruct_type: string | null;
  };
  pricing: {
    prompt: string;
    completion: string;
    [key: string]: string | undefined;
  };
  top_provider: {
    context_length: number;
    max_completion_tokens: number;
    is_moderated: boolean;
  };
  supported_parameters: string[];
  [key: string]: unknown;
}

/**
 * Convert a single OpenRouter model to a pickai Model.
 */
export function parseOpenRouterModel(raw: OpenRouterModel): Model {
  const provider = raw.id.split("/")[0];
  const apiId = extractDirectModelId(raw.id);
  const id = normalizeModelId(raw.id);

  // Strip "Provider: " prefix from name
  const name = raw.name.includes(": ")
    ? raw.name.split(": ").slice(1).join(": ")
    : raw.name;

  const params = raw.supported_parameters ?? [];

  const created = new Date(raw.created * 1000).toISOString().slice(0, 10);

  return {
    id,
    apiId,
    openRouterId: raw.id,
    name,
    provider,
    contextWindow: raw.context_length,
    pricing: {
      input: Math.max(0, parseFloat(raw.pricing.prompt) * 1_000_000),
      output: Math.max(0, parseFloat(raw.pricing.completion) * 1_000_000),
    },
    modality: {
      input: raw.architecture.input_modalities,
      output: raw.architecture.output_modalities,
    },
    capabilities: {
      tools: params.includes("tools"),
      vision: raw.architecture.input_modalities.includes("image"),
      streaming: true, // all OpenRouter models support streaming
      json: params.includes("response_format"),
    },
    created,
  };
}

/**
 * Convert a full OpenRouter API response to an array of pickai Models.
 */
export function parseOpenRouterCatalog(rawResponse: {
  data: OpenRouterModel[];
}): Model[] {
  return rawResponse.data.map(parseOpenRouterModel);
}
