/**
 * Display formatting utilities for model metadata
 */

/**
 * Format a per-million token price for display.
 *
 * @example
 * formatPrice(0)    // "Free"
 * formatPrice(0.005) // "<$0.01/M"
 * formatPrice(0.50) // "$0.50/M"
 * formatPrice(15)   // "$15.0/M"
 */
export function formatPrice(perMillion: number): string {
  if (perMillion === 0) return "Free";
  if (perMillion < 0.01) return "<$0.01/M";
  if (perMillion < 1) return `$${perMillion.toFixed(2)}/M`;
  return `$${perMillion.toFixed(1)}/M`;
}

/**
 * Format combined input/output pricing for display.
 *
 * @example
 * formatPricing({ input: 3, output: 15 }) // "$3/$15 per 1M"
 * formatPricing({ input: 0, output: 0 })  // "Free"
 */
export function formatPricing(pricing: {
  input: number;
  output: number;
}): string {
  if (pricing.input === 0 && pricing.output === 0) {
    return "Free";
  }

  const formatNum = (n: number) => {
    if (n === Math.floor(n)) return n.toString();
    return n.toFixed(2).replace(/\.?0+$/, "");
  };

  return `$${formatNum(pricing.input)}/$${formatNum(pricing.output)} per 1M`;
}

/**
 * Format a context window token count for display.
 *
 * @example
 * formatContextWindow(128000)  // "128K"
 * formatContextWindow(1000000) // "1.0M"
 */
export function formatContextWindow(tokens: number): string {
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(1)}M`;
  }
  return `${Math.round(tokens / 1000)}K`;
}

/**
 * Format a provider slug as a human-readable name.
 *
 * @example
 * formatProviderName("openai")     // "OpenAI"
 * formatProviderName("meta-llama") // "Meta Llama"
 */
export function formatProviderName(slug: string): string {
  const specialCases: Record<string, string> = {
    openai: "OpenAI",
    anthropic: "Anthropic",
    google: "Google",
    "meta-llama": "Meta Llama",
    mistralai: "Mistral AI",
    deepseek: "DeepSeek",
    cohere: "Cohere",
    perplexity: "Perplexity",
    "x-ai": "xAI",
    nvidia: "NVIDIA",
    amazon: "Amazon",
    microsoft: "Microsoft",
  };

  if (specialCases[slug]) {
    return specialCases[slug];
  }

  // Fallback: capitalize each word
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
