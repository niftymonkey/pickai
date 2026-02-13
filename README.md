# pickai

AI SDKs solve calling models. Model routers give you a catalog. But choosing the *right* model for a task — comparing pricing, matching capabilities, handling different ID formats across providers — that logic keeps getting rewritten in every app. **pickai** is the missing layer between "here are 300 models" and "use this one."

## Packages

| Package | Description |
|---------|------------|
| [`@pickai/core`](./packages/core) | Classify, score, and recommend AI models across providers. Normalize IDs, compare pricing, filter by capabilities. Zero deps. |
| `@pickai/server` | Provider availability checking (planned) |
| `@pickai/react` | Headless hook + reference component (planned) |
| `@pickai/models` | Curated model data for known models (planned) |

## Quick Start

```bash
pnpm add @pickai/core
```

```typescript
import {
  recommend, Purpose,
  matchesModel,
  classifyTier, Tier,
  classifyCostTier, Cost,
  maxCost, minTier,
  formatPricing,
} from "@pickai/core";
import { parseOpenRouterCatalog } from "@pickai/core/adapters";

// Convert OpenRouter API response → Model[]
const response = await fetch("https://openrouter.ai/api/v1/models");
const models = parseOpenRouterCatalog(await response.json());

// Recommend the best model for a purpose
recommend(models, Purpose.Balanced);              // → top standard-tier model
recommend(models, Purpose.Cheap, { count: 3 });   // → top 3 efficient-tier models
recommend(models, Purpose.Coding);                // → standard-tier with tool calling

// Cross-format model matching
matchesModel("anthropic/claude-3.5-haiku", "claude-3-5-haiku-20241022"); // true

// Classification with namespaced constants
classifyTier(model) === Tier.Flagship;
classifyCostTier(model) === Cost.Premium;

// Filter by range — predicates for .filter()
models.filter(maxCost(Cost.Standard));  // free + budget + standard
models.filter(minTier(Tier.Standard));  // standard + flagship

// Display formatting
formatPricing({ input: 3, output: 15 }); // "$3/$15 per 1M"
```

## Development

```bash
pnpm install
pnpm build
pnpm test
```

## License

MIT
