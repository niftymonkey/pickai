# pickai

AI SDKs solve calling models. Model routers give you a catalog. But choosing the *right* model for a task — comparing pricing, matching capabilities, handling different ID formats across providers — that logic keeps getting rewritten in every app. **pickai** is the missing layer between "here are 300 models" and "use this one."

Zero runtime dependencies, works everywhere (browser, Node, edge).

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
pnpm add pickai
```

```typescript
import {
  parseOpenRouterCatalog,
  enrich, groupByProvider,
  recommend, Purpose,
  matchesModel,
  Tier, Cost, maxCost, minTier,
} from "pickai";

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

## API Reference

### Adapters

Adapters convert raw provider API responses into pickai `Model[]`:

```typescript
import { parseOpenRouterCatalog } from "pickai";

const response = await fetch("https://openrouter.ai/api/v1/models");
const models = parseOpenRouterCatalog(await response.json());
// → Model[] ready for classify, score, recommend
```

#### Why OpenRouter only?

Direct provider APIs (OpenAI, Google, Anthropic) return minimal model metadata — no pricing, limited capabilities, and inconsistent context window data. OpenRouter aggregates all of this into a single rich catalog.

#### What the adapter handles

Pricing conversion (per-token strings to per-million numbers), capability detection from `supported_parameters`, modality mapping, and name cleanup. You handle the fetch, pickai handles the parsing — keeping the core 100% pure functions with zero side effects.

Adapters are also available via the `pickai/adapters` subpath if you prefer a separate import.

### Recommendation

The high-level API — pass a purpose name and get back the best model(s). Handles scoring and tier filtering internally. Non-text-focused models (image/audio/video generators) are filtered out by default.

```typescript
import { recommend, Purpose } from "pickai";

const top = recommend(models, Purpose.Balanced);
// → ScoredModel[] (default: 1 result)

// Multiple results — ranked purely by score
const picks = recommend(models, Purpose.Coding, { count: 3 });

// Prefer different providers in results
recommend(models, Purpose.Coding, { count: 3, providerDiversity: true });

// Include non-text models (image generators, etc.)
recommend(models, Purpose.Quality, { textOnly: false });
```

`preferredTier` is a hard filter, not a weight. Models in the preferred tier are always considered first. Adjacent tiers are only used as fallbacks when the preferred tier can't fill the requested count.

#### Built-in Profiles

Each profile maps to a tier preference, scoring weights, and optional requirements:

| Constant | Tier | Emphasis | Notes |
|----------|------|----------|-------|
| `Purpose.Cheap` | Efficient | Cost 60% | Cheapest models |
| `Purpose.Balanced` | Standard | Quality 40% | General purpose |
| `Purpose.Quality` | Flagship | Quality 70% | Best quality |
| `Purpose.Coding` | Standard | Quality 50% | Requires tool calling |
| `Purpose.Creative` | Flagship | Quality 70% | Creative writing |
| `Purpose.Reviewer` | Standard | Quality 50% | Requires tools + 8K context, excludes code/vision models |

#### Custom Profiles

For use cases that don't fit a built-in profile, pass a `PurposeProfile` object directly:

```typescript
recommend(models, {
  preferredTier: Tier.Standard,
  weights: { cost: 0.5, quality: 0.3, context: 0.2 },
  require: { tools: true },
  exclude: { patterns: ["gpt"] },
});
```

### Enrichment

Pre-compute display fields for UI rendering. `enrich()` decorates each model with tier, cost tier, formatted labels, and provider name:

```typescript
import { enrich, recommend, Purpose } from "pickai";

// Single model
const model = enrich(rawModel);
model.tier;          // Tier.Flagship
model.costTier;      // Cost.Premium
model.providerName;  // "Anthropic"
model.priceLabel;    // "$15/$75 per 1M"
model.contextLabel;  // "200K"

// Works with .map()
const models = rawModels.map(enrich);

// Chains with .filter()
const affordable = models
  .map(enrich)
  .filter(m => m.costTier <= Cost.Standard);
```

`EnrichedModel` extends `Model` — all original fields preserved, enrichment added.

### Grouping

Group models by provider for section-based UI rendering:

```typescript
import { groupByProvider, enrich } from "pickai";

const groups = groupByProvider(models.map(enrich));
// → [
//   { provider: "anthropic", providerName: "Anthropic", models: [...] },
//   { provider: "openai",    providerName: "OpenAI",    models: [...] },
//   ...
// ]

// Render with .map()
groups.map(({ providerName, models }) =>
  renderSection(providerName, models.map(renderItem))
);
```

Providers are sorted alphabetically by default. Pin specific providers to the top with `priority`:

```typescript
// Major providers first, then alphabetical
groupByProvider(models, { priority: ["anthropic", "openai", "google"] });
```

Generic preserves enrichment — pass `EnrichedModel[]`, get `ProviderGroup<EnrichedModel>[]` back.

---

### Composable API

`recommend()` handles the full pipeline internally. The sections below cover the individual functions it's built from — use these when you need custom scoring logic, specific filters, or more control over model selection.

#### Classification

##### Capability Tier

`classifyTier` categorizes models by capability based on naming patterns and pricing:

| Tier | Signal | Examples |
|------|--------|----------|
| `Tier.Efficient` | mini, nano, flash, haiku, lite, tiny, small | Haiku, GPT-4o Mini, Gemini Flash |
| `Tier.Standard` | Everything else | Sonnet, GPT-4o, Gemini |
| `Tier.Flagship` | opus, ultra, pro, or input >= $10/M | Opus, GPT-5 Pro, o1 Pro |

```typescript
import { classifyTier, Tier } from "pickai";

classifyTier(model) === Tier.Flagship
```

##### Cost Tier

`classifyCostTier` categorizes models by input pricing per 1M tokens. Boundaries based on the OpenRouter catalog (Feb 2026):

| Tier | Input Price | Examples |
|------|-------------|----------|
| `Cost.Free` | $0 | Free-tier models |
| `Cost.Budget` | < $2/M | Haiku ($1), GPT-4o Mini ($0.15) |
| `Cost.Standard` | $2 - $10/M | Sonnet ($3), GPT-4o ($2.50), Opus 4.5 ($5) |
| `Cost.Premium` | $10 - $20/M | Opus 4 ($15), o1 ($15), GPT-4 Turbo ($10) |
| `Cost.Ultra` | >= $20/M | o3-pro ($20), GPT-5.2 Pro ($21), o1-pro ($150) |

```typescript
import { classifyCostTier, Cost } from "pickai";

classifyCostTier(model) === Cost.Premium
```

##### Filtering by Range

Ordinal helpers return predicates for use with `.filter()`:

```typescript
import { maxCost, minTier, Tier, Cost } from "pickai";

// Affordable models (free + budget + standard)
models.filter(maxCost(Cost.Standard));

// Capable models (standard + flagship)
models.filter(minTier(Tier.Standard));
```

For combining multiple filters, enriched models read more naturally:

```typescript
models.map(enrich).filter(m =>
  m.costTier <= Cost.Standard && m.tier >= Tier.Standard
);
```

All four predicates: `maxTier`, `minTier`, `maxCost`, `minCost`.

##### Capability Checks

```typescript
import { supportsTools, supportsVision, isTextFocused } from "pickai";

supportsTools(model);  // true if capabilities.tools is set
supportsVision(model); // true if capabilities.vision or image input modality
isTextFocused(model);  // true if outputs text only (no image/audio/video)
```

#### ID Utilities

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

#### Formatting

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

#### Scoring

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
} from "pickai";

const scored = scoreModels(models, [
  { criterion: costEfficiency, weight: 0.4 },
  { criterion: contextCapacity, weight: 0.3 },
  { criterion: recency, weight: 0.3 },
]);
// → ScoredModel[] sorted by score descending
```

Built-in criteria: `costEfficiency` (cheaper = higher), `contextCapacity` (larger = higher), `recency` (newer = higher), `versionFreshness` (higher version = higher), `tierFit(targetTier)` (closer to target tier = higher).

#### Selection

Select top models with constraints (operates on pre-scored models):

```typescript
import { selectModels, providerDiversity, minContextWindow } from "pickai";

const picks = selectModels(scored, {
  count: 3,
  constraints: [providerDiversity(), minContextWindow(128000)],
});
```

Uses a two-pass algorithm: first pass respects constraints, second pass fills remaining slots ignoring constraints (so you always get results).

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

## Development

```bash
pnpm install        # install dependencies
pnpm build          # build (tsup → ESM + CJS + .d.ts)
pnpm test           # run tests (vitest)
pnpm update-fixture # refresh OpenRouter model fixture
```

### Project structure

```
src/
  adapters/   # Provider-specific parsers (OpenRouter)
  *.ts        # One module per concern (classify, score, enrich, group, etc.)
  *.test.ts   # Co-located tests
scripts/
  update-openrouter-fixture.sh
```

### Testing

Three layers of tests catch different classes of problems:

- **Unit tests** (`*.test.ts` co-located with each module) — verify individual functions in isolation using synthetic fixtures from `src/test-utils.ts`. Catch logic regressions in classification, scoring, formatting, ID normalization, etc.
- **Integration tests** (`integration.test.ts`) — exercise the full pipeline (`parseOpenRouterCatalog → enrich → recommend/score/select/group`) against the real OpenRouter fixture. Catch cross-module regressions where changes in one module (e.g., tier classification thresholds) silently break downstream behavior (e.g., recommendation results).
- **Smoke tests** (`smoke.test.ts`) — verify that every public export from both entry points (`pickai` and `pickai/adapters`) resolves correctly. Catch broken barrel exports — the kind of bug where the library builds fine but consumers get `undefined` at runtime because an export was renamed or removed.

Run `pnpm build` before committing to catch type errors that vitest might miss.

## License

MIT
