// The slug OpenRouter publishes a model under.

const DATE_SUFFIX = /-\d{8}$/;
const TRAILING_VERSION = /-(\d+)-(\d+)$/;

// OpenRouter spells two makers differently from models.dev (9.12).
const OPENROUTER_SELLER_SLUG: Record<string, string> = {
  mistral: "mistralai",
  xai: "x-ai",
};

const deriveOpenRouterId = (provider: string, modelId: string): string => {
  const seller = OPENROUTER_SELLER_SLUG[provider] ?? provider;
  if (provider !== "anthropic") {
    return `${seller}/${modelId}`;
  }
  // Anthropic publishes "claude-sonnet-4.5". Dropping the date first stops it
  // colliding with the version dot, which produced "claude-sonnet-4-5.20250929".
  const withoutDate = modelId.replace(DATE_SUFFIX, "");
  return `${seller}/${withoutDate.replace(TRAILING_VERSION, "-$1.$2")}`;
};

export { deriveOpenRouterId };
