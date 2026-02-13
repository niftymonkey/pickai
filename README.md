# pickai

AI SDKs solve calling models. Model routers give you a catalog. But choosing the *right* model for a task — comparing pricing, matching capabilities, handling different ID formats across providers — that logic keeps getting rewritten in every app. **pickai** is the missing layer between "here are 300 models" and "use this one."

## Packages

| Package | Description |
|---------|------------|
| [`@pickai/core`](./packages/core) | Classify, score, and recommend AI models across providers. Normalize IDs, compare pricing, filter by capabilities. Zero deps. |
| `@pickai/server` | Provider availability checking (planned) |
| `@pickai/react` | Headless hook + reference component (planned) |
| `@pickai/models` | Curated model data for known models (planned) |

## Data Source

pickai works with the rich model metadata from [OpenRouter's API](https://openrouter.ai/api/v1/models) — pricing, context windows, capabilities, and modality across all major providers in a single catalog. Direct provider APIs (OpenAI, Google, Anthropic) return minimal metadata that isn't sufficient for meaningful scoring or comparison.

## Types

Data flows through a pipeline, with each step adding fields:

| Type | Source | Adds |
|------|--------|------|
| `Model` | Adapters | `id`, `apiId`, `openRouterId`, provider, name, pricing, capabilities |
| `EnrichedModel` | `.map(enrich)` | `tier`, `costTier`, `providerName`, `priceLabel`, `contextLabel` |
| `ScoredModel<T>` | `recommend()`, `scoreModels()` | `score` (0-1) |
| `ProviderGroup<T>` | `groupByProvider()` | `provider`, `providerName`, `models: T[]` |

Generic types preserve what you pass in — score `EnrichedModel[]` and you get both score and enriched fields back.

## Quick Start

```bash
pnpm add @pickai/core
```

```typescript
import {
  parseOpenRouterCatalog,
  enrich, groupByProvider,
  recommend, Purpose,
  matchesModel,
  Tier, Cost, maxCost, minTier,
} from "@pickai/core";

// Fetch the full model catalog from OpenRouter
const response = await fetch("https://openrouter.ai/api/v1/models");
// Parse and enrich with tier, cost, and display fields
const models = parseOpenRouterCatalog(await response.json()).map(enrich);

// Recommend the best model for a purpose
recommend(models, Purpose.Balanced);              // → top standard-tier model
recommend(models, Purpose.Cheap, { count: 3 });   // → top 3 efficient-tier models
recommend(models, Purpose.Coding);                // → standard-tier with tool calling

// Group by provider for section-based rendering
groupByProvider(models).map(({ providerName, models }) =>
  renderSection(providerName, models.map(renderItem))
);

// Filter on enriched fields
models.filter(m => m.costTier <= Cost.Standard);  // affordable models
models.filter(m => m.tier >= Tier.Standard);       // capable models

// Cross-format model matching
matchesModel("anthropic/claude-3.5-haiku", "claude-3-5-haiku-20241022"); // true
```

## Development

```bash
pnpm install
pnpm build
pnpm test
```

## License

MIT
