# Utilities

[Back to API Reference](api.md) | [Back to README](../README.md)

## ID Utilities

Every provider uses a different format for the same model — OpenRouter prefixes with `anthropic/`, direct APIs append date suffixes, some use dots where others use hyphens. These helpers let you compare and resolve models regardless of where the ID came from.

```typescript
import {
  normalizeModelId,
  matchesModel,
  resolveProvider,
  extractVersion,
  parseModelId,
} from "pickai";

// Normalize for comparison (strips prefix, dots->hyphens, removes dates)
normalizeModelId("anthropic/claude-3.5-haiku");  // "claude-3-5-haiku"
normalizeModelId("claude-3-5-haiku-20241022");   // "claude-3-5-haiku"

// Cross-format matching
matchesModel("anthropic/claude-3.5-haiku", "claude-3-5-haiku-20241022"); // true

// Provider resolution
resolveProvider("anthropic/claude-3.7-sonnet"); // "anthropic"
resolveProvider("gpt-4o");                      // "openai"

// Version extraction (for scoring/sorting)
extractVersion("openai/gpt-5.2");              // 520
extractVersion("anthropic/claude-sonnet-4.5"); // 450
extractVersion("mistralai/mixtral-8x22b");     // 0 (size, not version)
```

## Formatting

Raw model data comes as numbers and slugs — `128000` tokens, `meta-llama` as a provider, `15` dollars per million. These turn that into display-ready strings.

```typescript
import {
  formatPrice,
  formatPricing,
  formatContextWindow,
  formatProviderName,
} from "pickai";

formatPrice(0);          // "Free"
formatPrice(0.25);       // "$0.25/M"
formatPrice(15);         // "$15.0/M"

formatPricing({ input: 3, output: 15 }); // "$3/$15 per 1M"

formatContextWindow(128000);  // "128K"
formatContextWindow(1000000); // "1.0M"

formatProviderName("meta-llama"); // "Meta Llama"
formatProviderName("x-ai");      // "xAI"
```
