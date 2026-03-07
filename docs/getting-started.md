# Getting Started

[Back to API Reference](api.md) | [Back to README](../README.md)

## Adapters

Adapters convert raw provider API responses into pickai `Model[]`:

```typescript
import { parseOpenRouterCatalog } from "pickai";

const response = await fetch("https://openrouter.ai/api/v1/models");
const models = parseOpenRouterCatalog(await response.json());
// → Model[] ready for classify, score, recommend
```

### Why OpenRouter only?

Direct provider APIs (OpenAI, Google, Anthropic) return minimal model metadata — no pricing, limited capabilities, and inconsistent context window data. OpenRouter aggregates all of this into a single rich catalog.

### What the adapter handles

Pricing conversion (per-token strings to per-million numbers), capability detection from `supported_parameters`, modality mapping, and name cleanup. You handle the fetch, pickai handles the parsing — keeping the core 100% pure functions with zero side effects.

Adapters are also available via the `pickai/adapters` subpath if you prefer a separate import.

## Enrichment

Pre-compute display fields for UI rendering. `enrich()` is a convenience wrapper that adds tier, cost tier, and display labels in one step:

```typescript
import { enrich } from "pickai";

const model = enrich(rawModel);
model.tier;          // Tier.Flagship
model.costTier;      // Cost.Premium
model.providerName;  // "Anthropic"
model.priceLabel;    // "$15/$75 per 1M"
model.contextLabel;  // "200K"

const models = rawModels.map(enrich);
```

### Composable Enrichers

Use individual enrichers when you only need a subset of fields:

```typescript
import { withClassification, withDisplayLabels, withAaSlug } from "pickai";

// Just tier + costTier
models.map(withClassification);

// Just display labels
models.map(withDisplayLabels);

// Derive Artificial Analysis slugs for benchmark data lookups
models.map(withAaSlug);
// → model.apiSlugs.artificialAnalysis = "claude-opus-4-6"

// Compose freely — each returns a type intersection
models.map(enrich).map(withAaSlug);
```

`EnrichedModel` is `ClassifiedModel & LabeledModel`. All enrichers preserve original Model fields.

## Grouping

Group models by provider for organized display:

```typescript
import { groupByProvider, enrich } from "pickai";

const groups = groupByProvider(models.map(enrich));
// → [
//   { provider: "anthropic", providerName: "Anthropic", models: [...] },
//   { provider: "openai",    providerName: "OpenAI",    models: [...] },
//   ...
// ]
```

Each group contains `provider` (slug), `providerName` (display-ready), and `models` (the subset for that provider). Use the structure however fits your UI — iterate with `.map()`, pass to components, build a lookup, etc.

Providers are sorted alphabetically by default. Pin specific providers to the top with `priority`:

```typescript
// Major providers first, then alphabetical
groupByProvider(models, { priority: ["anthropic", "openai", "google"] });
```

Generic preserves enrichment — pass `EnrichedModel[]`, get `ProviderGroup<EnrichedModel>[]` back.

## Recommendation

The high-level API — pass a purpose name and get back the best model(s). Handles scoring and tier filtering internally. Non-text-focused models (image/audio/video generators) are filtered out by default.

```typescript
import { recommend, Purpose } from "pickai";

const top = recommend(models, Purpose.Balanced);
// → ScoredModel[] (default: 1 result)

// Multiple results — ranked purely by score
const picks = recommend(models, Purpose.Quality, { count: 3 });

// Prefer different providers in results
recommend(models, Purpose.Balanced, { count: 3, providerDiversity: true });

// Include non-text models (image generators, etc.)
recommend(models, Purpose.Quality, { textOnly: false });
```

`preferredTier` is a hard filter, not a weight. Models in the preferred tier are always considered first. Adjacent tiers are only used as fallbacks when the preferred tier can't fill the requested count.

### Built-in Profiles

Each profile maps to a tier preference and weighted scoring criteria:

| Constant | Tier | Criteria | Notes |
|----------|------|----------|-------|
| `Purpose.Cheap` | Efficient | Cost 70%, Context 30% | Cheapest models that still have usable context |
| `Purpose.Balanced` | Standard | Cost 30%, Recency 40%, Context 30% | General purpose |
| `Purpose.Quality` | Flagship | Cost 10%, Recency 70%, Context 20% | Newest flagships |

Built-in profiles use `recency` (newer release date = higher score) as the primary signal for model capability. This works well as a general proxy, but for domain-specific use cases like coding or creative writing, you'll want benchmark-based scoring — see [Custom Profiles](#custom-profiles) and the [Scoring guide](scoring.md).

### Custom Profiles

For use cases that don't fit a built-in profile, pass a `PurposeProfile` object directly. The `criteria` array accepts any mix of built-in and custom criteria:

```typescript
import { recommend, costEfficiency, recency, contextCapacity, Tier } from "pickai";

recommend(models, {
  preferredTier: Tier.Standard,
  criteria: [
    { criterion: costEfficiency, weight: 0.5 },
    { criterion: recency, weight: 0.3 },
    { criterion: contextCapacity, weight: 0.2 },
  ],
  require: { tools: true },
  exclude: { patterns: ["gpt"] },
});
```

Weights are normalized internally, so `[0.5, 0.3, 0.2]` and `[5, 3, 2]` produce identical results.

You can also pass custom `ScoringCriterion` functions directly in `criteria` — for example, to score models against external benchmark data. See [Scoring](scoring.md) for the full guide.
