/**
 * Model ID utilities
 *
 * Parse, normalize, and match model IDs across formats:
 * - OpenRouter: "anthropic/claude-3.7-sonnet"
 * - Direct/AI SDK: "claude-3-7-sonnet-20250219"
 * - Variants: "anthropic/claude-3.7-sonnet:thinking"
 */

/**
 * Parsed model ID components
 */
export interface ParsedModelId {
  /** Provider name, or null if unknown */
  provider: string | null;
  /** Model name (without provider prefix, with variant stripped) */
  model: string;
  /** Variant suffix (e.g., "thinking", "beta", "free") */
  variant?: string;
}

/**
 * Normalize a model ID for comparison across formats.
 *
 * Steps:
 * 1. Remove provider prefix ("anthropic/")
 * 2. Replace dots with hyphens (3.7 -> 3-7)
 * 3. Remove 8-digit date suffixes (-20250219)
 * 4. Lowercase
 *
 * @example
 * normalizeModelId("anthropic/claude-3.5-haiku")  // "claude-3-5-haiku"
 * normalizeModelId("claude-3-5-haiku-20241022")   // "claude-3-5-haiku"
 */
export function normalizeModelId(modelId: string): string {
  let normalized = modelId;

  // Remove provider prefix
  if (normalized.includes("/")) {
    normalized = normalized.split("/").slice(1).join("/");
  }

  // Replace dots with hyphens
  normalized = normalized.replace(/\./g, "-");

  // Remove date suffixes (8 digits at end, preceded by hyphen)
  normalized = normalized.replace(/-\d{8}$/, "");

  return normalized.toLowerCase();
}

/**
 * Parse a model ID into its components.
 */
export function parseModelId(modelId: string): ParsedModelId {
  let provider: string | null = null;
  let model = modelId;
  let variant: string | undefined;

  // Extract provider from OpenRouter format
  if (model.includes("/")) {
    provider = model.split("/")[0];
    model = model.split("/").slice(1).join("/");
  }

  // Extract variant suffix
  if (model.includes(":")) {
    const colonIndex = model.indexOf(":");
    variant = model.slice(colonIndex + 1);
    model = model.slice(0, colonIndex);
  }

  // Infer provider from model name if not explicit
  if (!provider) {
    provider = inferProvider(model);
  }

  return { provider, model, variant };
}

/**
 * Resolve the provider from a model ID.
 *
 * OpenRouter format: extracts from prefix.
 * Direct format: infers from model name.
 *
 * @returns Provider name or null if unknown
 */
export function resolveProvider(modelId: string): string | null {
  // OpenRouter format: extract directly
  if (modelId.includes("/")) {
    return modelId.split("/")[0];
  }

  return inferProvider(modelId);
}

/**
 * Extract the model ID portion from an OpenRouter format ID.
 *
 * @example
 * extractDirectModelId("openai/gpt-4o") // "gpt-4o"
 * extractDirectModelId("gpt-4o")        // "gpt-4o"
 */
export function extractDirectModelId(modelId: string): string {
  if (modelId.includes("/")) {
    return modelId.split("/").slice(1).join("/");
  }
  return modelId;
}

/**
 * Convert a model ID to OpenRouter format ("provider/model").
 *
 * @returns OpenRouter format ID, or null if provider can't be inferred
 */
export function toOpenRouterFormat(modelId: string): string | null {
  if (modelId.includes("/")) {
    return modelId;
  }

  const provider = inferProvider(modelId);
  if (!provider) {
    return null;
  }

  return `${provider}/${modelId}`;
}

/**
 * Convert a model ID to direct format (strip provider prefix).
 */
export function toDirectFormat(modelId: string): string {
  return extractDirectModelId(modelId);
}

/**
 * Check if two model IDs refer to the same model, across formats.
 *
 * @example
 * matchesModel("anthropic/claude-3.5-haiku", "claude-3-5-haiku-20241022") // true
 */
export function matchesModel(a: string, b: string): boolean {
  return normalizeModelId(a) === normalizeModelId(b);
}

/**
 * Extract and normalize a version number from a model ID.
 *
 * Returns a numeric score: 5.2 -> 520, 4.5 -> 450, 3 -> 300.
 * Returns 0 for models without recognizable version numbers.
 *
 * Ignores date codes (2512), model sizes (70b, 8x22b), and
 * decimal sizes (3.5b).
 */
export function extractVersion(modelId: string): number {
  const lower = modelId.toLowerCase();

  // Match X.Y version patterns, excluding:
  // - Followed by "b" (model size like "3.5b")
  // - Part of NxM pattern (like "8x22b")
  const dotMatch = lower.match(/(?<![x\d])(\d+)\.(\d+)(?!b)(?!x)/);
  if (dotMatch) {
    const major = parseInt(dotMatch[1], 10);
    const minor = parseInt(dotMatch[2], 10);
    if (major >= 1 && major <= 9) {
      return major * 100 + minor * 10;
    }
  }

  // Single digit version after hyphen: "gpt-5", "claude-4"
  // NOT followed by digits, ".", "b", or "x"
  const singleMatch = lower.match(/-([1-9])(?![0-9.bx])/);
  if (singleMatch) {
    return parseInt(singleMatch[1], 10) * 100;
  }

  // O-series reasoning models: "o1", "o3", "o4"
  const oModelMatch = lower.match(/\bo([1-9])(?:-|$)/);
  if (oModelMatch) {
    return parseInt(oModelMatch[1], 10) * 100;
  }

  return 0;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function inferProvider(modelName: string): string | null {
  const lower = modelName.toLowerCase();

  if (lower.startsWith("claude")) return "anthropic";
  if (lower.startsWith("gpt") || lower.startsWith("chatgpt")) return "openai";
  if (/^o[1-9](?:-|$)/.test(lower)) return "openai";
  if (lower.startsWith("gemini")) return "google";

  return null;
}
