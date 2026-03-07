# API Reference

[Back to README](../README.md)

## Types

Data flows through a pipeline, with each step adding fields:

| Type | Source | Adds |
|------|--------|------|
| `Model` | Adapters | `id`, `apiSlugs` (`openRouter`, `direct?`, `artificialAnalysis?`), provider, name, pricing, capabilities |
| `ClassifiedModel` | `.map(withClassification)` | `tier`, `costTier` |
| `LabeledModel` | `.map(withDisplayLabels)` | `providerName`, `priceLabel`, `contextLabel` |
| `EnrichedModel` | `.map(enrich)` | All of `ClassifiedModel` + `LabeledModel` |
| `AaSlugModel` | `.map(withAaSlug)` | `apiSlugs.artificialAnalysis` (required string) |
| `ScoredModel<T>` | `recommend()`, `scoreModels()` | `score` (0-1) |
| `ProviderGroup<T>` | `groupByProvider()` | `provider`, `providerName`, `models: T[]` |

Generic types preserve what you pass in — score `EnrichedModel[]` and you get both score and enriched fields back.

### Model

Every model carries pre-computed API identifiers in `apiSlugs`:

```typescript
interface ApiSlugs {
  openRouter: string;              // "anthropic/claude-sonnet-4-5"
  direct?: string;                 // "claude-sonnet-4-5-20250929"
  artificialAnalysis?: string;     // "claude-sonnet-4-5" (populated by withAaSlug())
}

interface Model {
  id: string;            // Base identity: "claude-sonnet-4-5"
  apiSlugs: ApiSlugs;    // Pre-computed IDs for different calling conventions
  provider: string;      // Provider slug: "anthropic"
  name: string;          // Display name: "Claude Sonnet 4.5"
  // ...pricing, capabilities, context window, modality
}
```

## Documentation

| Topic | Description |
|-------|-------------|
| [Getting Started](getting-started.md) | Parsing, enrichment, grouping, and recommendation |
| [Scoring](scoring.md) | Custom scoring criteria, external benchmark integration, `scoreModels()` + `selectModels()` |
| [Classification](classification.md) | Capability tiers, cost tiers, filters, and capability checks |
| [Utilities](utilities.md) | ID normalization, cross-format matching, and display formatting |
