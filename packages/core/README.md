# @pickai/core

Classify, score, and recommend AI models across providers. Normalize IDs, compare pricing, filter by capabilities. Zero runtime dependencies, works everywhere (browser, Node, edge).

## Install

```bash
pnpm add @pickai/core
```

## Model Type

Every model carries three pre-computed IDs for different calling conventions:

```typescript
interface Model {
  id: string;            // Base identity: "claude-sonnet-4-5"
  apiId: string;         // For direct APIs / AI SDK: "claude-sonnet-4-5-20250929"
  openRouterId: string;  // For OpenRouter: "anthropic/claude-sonnet-4-5"
  provider: string;      // Provider slug: "anthropic"
  name: string;          // Display name: "Claude Sonnet 4.5"
  // ...pricing, capabilities, context window, modality
}
```

## Adapters

Adapters convert raw provider API responses into pickai `Model[]`. Import from the `@pickai/core/adapters` subpath:

```typescript
import { parseOpenRouterCatalog } from "@pickai/core/adapters";

const response = await fetch("https://openrouter.ai/api/v1/models");
const models = parseOpenRouterCatalog(await response.json());
// → Model[] ready for classify, score, recommend
```

### Why OpenRouter only?

Direct provider APIs (OpenAI, Google, Anthropic) return minimal model metadata — no pricing, limited capabilities, and inconsistent context window data. OpenRouter aggregates all of this into a single rich catalog. For direct provider model data, see `@pickai/models` (planned).

### What the adapter handles

Pricing conversion (per-token strings to per-million numbers), capability detection from `supported_parameters`, modality mapping, and name cleanup. You handle the fetch, pickai handles the parsing — keeping the core 100% pure functions with zero side effects.

## Recommendation

The high-level API — pass a purpose name and get back the best model(s). Handles scoring, tier filtering, and provider diversity internally.

```typescript
import { recommend, Purpose } from "@pickai/core";

const top = recommend(models, Purpose.Balanced);
// → ScoredModel[] (default: 1 result)

// Multiple results with provider diversity
const picks = recommend(models, Purpose.Coding, { count: 3 });
```

`preferredTier` is a hard filter, not a weight. Models in the preferred tier are always considered first. Adjacent tiers are only used as fallbacks when the preferred tier can't fill the requested count.

### Built-in Profiles

Each profile maps to a tier preference, scoring weights, and optional requirements:

| Constant | Tier | Emphasis | Notes |
|----------|------|----------|-------|
| `Purpose.Cheap` | Efficient | Cost 60% | Cheapest models |
| `Purpose.Balanced` | Standard | Quality 40% | General purpose |
| `Purpose.Quality` | Flagship | Quality 70% | Best quality |
| `Purpose.Coding` | Standard | Quality 50% | Requires tool calling |
| `Purpose.Creative` | Flagship | Quality 70% | Creative writing |
| `Purpose.Reviewer` | Standard | Quality 50% | Requires tools + 8K context, excludes code/vision models |

### Custom Profiles

For use cases that don't fit a built-in profile, pass a `PurposeProfile` object directly:

```typescript
recommend(models, {
  preferredTier: Tier.Standard,
  weights: { cost: 0.5, quality: 0.3, context: 0.2 },
  require: { tools: true },
  exclude: { patterns: ["gpt"] },
});
```

---

## Composable API

`recommend()` handles the full pipeline internally. The sections below cover the individual functions it's built from — use these when you need custom scoring logic, specific filters, or more control over model selection.

### Classification

#### Capability Tier

`classifyTier` categorizes models by capability based on naming patterns and pricing:

| Tier | Signal | Examples |
|------|--------|----------|
| `Tier.Efficient` | mini, nano, flash, haiku, lite, tiny, small | Haiku, GPT-4o Mini, Gemini Flash |
| `Tier.Standard` | Everything else | Sonnet, GPT-4o, Gemini |
| `Tier.Flagship` | opus, ultra, pro, or input >= $10/M | Opus, GPT-5 Pro, o1 Pro |

```typescript
import { classifyTier, Tier } from "@pickai/core";

classifyTier(model) === Tier.Flagship
```

#### Cost Tier

`classifyCostTier` categorizes models by input pricing per 1M tokens. Boundaries based on the OpenRouter catalog (Feb 2026):

| Tier | Input Price | Examples |
|------|-------------|----------|
| `Cost.Free` | $0 | Free-tier models |
| `Cost.Budget` | < $2/M | Haiku ($1), GPT-4o Mini ($0.15) |
| `Cost.Standard` | $2 - $10/M | Sonnet ($3), GPT-4o ($2.50), Opus 4.5 ($5) |
| `Cost.Premium` | $10 - $20/M | Opus 4 ($15), o1 ($15), GPT-4 Turbo ($10) |
| `Cost.Ultra` | >= $20/M | o3-pro ($20), GPT-5.2 Pro ($21), o1-pro ($150) |

```typescript
import { classifyCostTier, Cost } from "@pickai/core";

classifyCostTier(model) === Cost.Premium
```

#### Filtering by Range

Ordinal helpers return predicates for use with `.filter()`:

```typescript
import { maxCost, minTier, Tier, Cost } from "@pickai/core";

// Affordable models (free + budget + standard)
models.filter(maxCost(Cost.Standard));

// Capable models (standard + flagship)
models.filter(minTier(Tier.Standard));

// Combine: affordable AND capable
models.filter(m => maxCost(Cost.Standard)(m) && minTier(Tier.Standard)(m));
```

All four: `maxTier`, `minTier`, `maxCost`, `minCost`.

#### Capability Checks

```typescript
import { supportsTools, supportsVision, isTextFocused } from "@pickai/core";

supportsTools(model);  // true if capabilities.tools is set
supportsVision(model); // true if capabilities.vision or image input modality
isTextFocused(model);  // true if outputs text only (no image/audio/video)
```

### ID Utilities

Every provider uses a different format for the same model — OpenRouter prefixes with `anthropic/`, direct APIs append date suffixes, some use dots where others use hyphens. These helpers let you compare and resolve models regardless of where the ID came from.

```typescript
import {
  normalizeModelId,
  matchesModel,
  resolveProvider,
  extractVersion,
  parseModelId,
} from "@pickai/core";

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

### Formatting

Raw model data comes as numbers and slugs — `128000` tokens, `meta-llama` as a provider, `15` dollars per million. These turn that into display-ready strings.

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

### Scoring

Score models using weighted criteria. Each criterion returns 0-1, normalized across the model set via min-max.

```typescript
import {
  scoreModels,
  costEfficiency,
  contextCapacity,
  recency,
  versionFreshness,
  tierFit,
  Tier,
} from "@pickai/core";

const scored = scoreModels(models, [
  { criterion: costEfficiency, weight: 0.4 },
  { criterion: contextCapacity, weight: 0.3 },
  { criterion: recency, weight: 0.3 },
]);
// → ScoredModel[] sorted by score descending
```

Built-in criteria: `costEfficiency` (cheaper = higher), `contextCapacity` (larger = higher), `recency` (newer = higher), `versionFreshness` (higher version = higher), `tierFit(targetTier)` (closer to target tier = higher).

### Selection

Select top models with constraints (operates on pre-scored models):

```typescript
import { selectModels, providerDiversity, minContextWindow } from "@pickai/core";

const picks = selectModels(scored, {
  count: 3,
  constraints: [providerDiversity(), minContextWindow(128000)],
});
```

Uses a two-pass algorithm: first pass respects constraints, second pass fills remaining slots ignoring constraints (so you always get results).
