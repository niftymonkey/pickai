# @pickai/core

Pure functions for AI model intelligence — ID normalization, cross-format matching, scoring, and recommendation. Zero runtime dependencies, works everywhere (browser, Node, edge).

## Install

```bash
pnpm add @pickai/core
```

## API

### Model Type

Every model carries three pre-computed IDs for different calling conventions:

```typescript
interface Model {
  id: string;            // Base identity: "claude-sonnet-4-5"
  apiId: string;         // For direct APIs / AI SDK: "claude-sonnet-4-5-20250929"
  openRouterId: string;  // For OpenRouter: "anthropic/claude-sonnet-4-5"
  provider: string;      // Provider slug: "anthropic"
  name: string;          // Display name: "Claude Sonnet 4.5"
  // ...pricing, capabilities, context window, etc.
}
```

### ID Utilities

```typescript
import {
  normalizeModelId,
  matchesModel,
  resolveProvider,
  extractVersion,
  parseModelId,
} from "@pickai/core";

// Normalize for comparison (strips prefix, dots→hyphens, removes dates)
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

### Formatting

```typescript
import {
  formatPrice,
  formatPricing,
  formatContextWindow,
  formatProviderName,
} from "@pickai/core";

formatPrice(0);          // "Free"
formatPrice(0.25);       // "$0.25/M"
formatPrice(15);         // "$15.0/M"

formatPricing({ input: 3, output: 15 }); // "$3/$15 per 1M"

formatContextWindow(128000);  // "128K"
formatContextWindow(1000000); // "1.0M"

formatProviderName("meta-llama"); // "Meta Llama"
formatProviderName("x-ai");      // "xAI"
```

## License

MIT
