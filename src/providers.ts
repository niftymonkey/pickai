/**
 * Provider constants for convenient filtering.
 *
 * These are simple arrays of provider IDs (matching models.dev slugs).
 * Use them with the `providers` filter field, extend with spread syntax,
 * or build your own list entirely.
 */

/** Providers with their own direct API. */
export const DIRECT_PROVIDERS = [
  "anthropic",
  "openai",
  "google",
  "mistral",
  "xai",
  "deepseek",
  "cohere",
] as const;

/**
 * All providers available via OpenRouter, including direct providers.
 * OpenRouter acts as a gateway to both direct-API providers and
 * providers that are only reachable through aggregators.
 */
export const OPENROUTER_PROVIDERS = [
  ...DIRECT_PROVIDERS,
  "llama",
  "nvidia",
  "qwen",
  "perplexity",
  "groq",
  "togetherai",
] as const;

/** All known providers from both lists, deduplicated. */
export const ALL_KNOWN_PROVIDERS = [
  ...new Set([...DIRECT_PROVIDERS, ...OPENROUTER_PROVIDERS]),
] as const;
