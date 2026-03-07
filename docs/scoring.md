# Scoring

[Back to API Reference](api.md) | [Back to README](../README.md)

## Built-in Criteria

Each criterion receives `(model, allModels)` and returns a value in the 0-1 range, normalized across the model set:

| Criterion | Scores higher when... | Notes |
|-----------|----------------------|-------|
| `costEfficiency` | Cheaper input pricing | |
| `contextCapacity` | Larger context window | |
| `recency` | Newer release date | Used in all built-in profiles as the primary "prefer newer models" signal |
| `versionFreshness` | Higher version number extracted from model ID | Useful for comparing within a provider (e.g., Claude 4.5 > 3.5), but version numbers aren't comparable across providers |
| `tierFit(targetTier)` | Closer to target tier | Exact = 1.0, adjacent = 0.5, distant = 0.1 |

## `scoreModels()`

Score models using weighted criteria and return sorted results:

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

Weights are normalized to sum to 1 internally, so `[0.4, 0.3, 0.3]` and `[4, 3, 3]` produce identical results.

## Selection with `selectModels()`

Select top models from a pre-scored list with optional constraints:

```typescript
import { selectModels, providerDiversity, minContextWindow } from "pickai";

const picks = selectModels(scored, {
  count: 3,
  constraints: [providerDiversity(), minContextWindow(128000)],
});
```

Uses a two-pass algorithm: first pass respects constraints, second pass fills remaining slots ignoring constraints (so you always get results).

## Custom Criteria

A `ScoringCriterion` is a function with this signature:

```typescript
type ScoringCriterion = (model: Model, allModels: Model[]) => number;
```

Criteria should return a value in the 0-1 range. The convention is to use min-max normalization against `allModels` so that the best model in the set scores 1.0 and the worst scores 0.0:

```typescript
import type { ScoringCriterion } from "pickai";

const myMetric: ScoringCriterion = (model, allModels) => {
  const value = getMetric(model);
  const values = allModels.map(getMetric);
  const max = Math.max(...values);
  const min = Math.min(...values);
  return max === min ? 0 : (value - min) / (max - min);
};
```

Pass custom criteria alongside built-in ones — they compose naturally:

```typescript
const scored = scoreModels(models, [
  { criterion: myMetric, weight: 0.5 },
  { criterion: costEfficiency, weight: 0.3 },
  { criterion: contextCapacity, weight: 0.2 },
]);
```

## Scoring with External Benchmark Data

This example shows a complete workflow for scoring models using quality benchmarks from Artificial Analysis, but the same pattern works with any external data source.

### 1. Derive AA slugs

Use `withAaSlug()` to get the `apiSlugs.artificialAnalysis` field, which maps OpenRouter model IDs to Artificial Analysis slugs:

```typescript
import { parseOpenRouterCatalog, withAaSlug } from "pickai";

const response = await fetch("https://openrouter.ai/api/v1/models");
const models = parseOpenRouterCatalog(await response.json()).map(withAaSlug);
// Each model now has model.apiSlugs.artificialAnalysis — e.g., "claude-opus-4-6"
```

### 2. Fetch benchmark data

Fetch quality scores from Artificial Analysis (or your benchmark source of choice):

```typescript
const aaResponse = await fetch("https://artificialanalysis.ai/api/models");
const benchmarks = await aaResponse.json();

// Build a lookup map: AA slug → quality score
const qualityScores = new Map<string, number>();
for (const entry of benchmarks) {
  qualityScores.set(entry.slug, entry.quality_index);
}
```

### 3. Handle slug mismatches

The `withAaSlug()` derivation covers most models, but some AA slugs don't follow the pattern (e.g., variant suffixes like `-thinking`). Override these with object spread:

```typescript
const fixed = models.map((m) => {
  if (m.apiSlugs.artificialAnalysis === "claude-sonnet-4-5" && m.id.includes("thinking")) {
    return { ...m, apiSlugs: { ...m.apiSlugs, artificialAnalysis: "claude-sonnet-4-5-thinking" } };
  }
  return m;
});
```

### 4. Create a custom criterion

Build a `ScoringCriterion` that uses the benchmark lookup. Extract a helper to keep the slug lookup readable:

```typescript
import type { Model, ScoringCriterion } from "pickai";

const aaScore = (scores: Map<string, number>) => (model: Model) =>
  scores.get(model.apiSlugs.artificialAnalysis ?? "") ?? 0;

const getQuality = aaScore(qualityScores);

const benchmarkQuality: ScoringCriterion = (model, allModels) => {
  const score = getQuality(model);
  const max = Math.max(...allModels.map(getQuality));
  return max > 0 ? score / max : 0;
};
```

### 5. Score and select

Compose the benchmark criterion with built-in criteria:

```typescript
import { scoreModels, costEfficiency, contextCapacity, selectModels } from "pickai";

const scored = scoreModels(fixed, [
  { criterion: benchmarkQuality, weight: 0.5 },
  { criterion: costEfficiency, weight: 0.3 },
  { criterion: contextCapacity, weight: 0.2 },
]);

const picks = selectModels(scored, { count: 3 });
```

## When to use `recommend()` vs `scoreModels()`

**Use `recommend()`** for most cases. It handles tier filtering, scoring, and selection in one call. Custom profiles accept the same `criteria` array as `scoreModels()`, so you can mix built-in and custom criteria — including external benchmark data — while still getting tier-based filtering and provider diversity.

```typescript
recommend(models, {
  preferredTier: Tier.Standard,
  criteria: [
    { criterion: benchmarkQuality, weight: 0.5 },
    { criterion: costEfficiency, weight: 0.3 },
    { criterion: contextCapacity, weight: 0.2 },
  ],
});
```

**Drop to `scoreModels()` + `selectModels()`** when you need:

- **No tier filtering** — `recommend()` always groups by tier distance; `scoreModels()` scores all models equally
- **Custom selection logic** — constraints beyond provider diversity and minimum context window
- **Scoring without selection** — when you want the full ranked list, not just the top N

## Domain-Specific Profiles

The built-in profiles (`Cheap`, `Balanced`, `Quality`) are intentionally general — they score on cost, recency, and context without making domain-specific quality judgments. Use cases like "best model for coding" or "best model for creative writing" require benchmark data to meaningfully evaluate.

These examples build on the [benchmark workflow above](#scoring-with-external-benchmark-data). They assume you've already fetched AA data, applied `withAaSlug()`, and have the `aaScore` helper from step 4. The key difference is which benchmark field you use.

### Coding

A coding profile needs tool calling for structured output, benefits from large context windows for multi-file context, and should score higher on coding-specific benchmarks:

```typescript
import { recommend, costEfficiency, contextCapacity, Tier } from "pickai";
import type { ScoringCriterion } from "pickai";

// Build a map from a coding-specific benchmark field
const codingScores = new Map<string, number>();
for (const entry of benchmarks) {
  codingScores.set(entry.slug, entry.coding_index);
}

const getCoding = aaScore(codingScores);
const codingBenchmark: ScoringCriterion = (model, allModels) => {
  const score = getCoding(model);
  const max = Math.max(...allModels.map(getCoding));
  return max > 0 ? score / max : 0;
};

recommend(models, {
  preferredTier: Tier.Standard,
  criteria: [
    { criterion: codingBenchmark, weight: 0.5 },
    { criterion: costEfficiency, weight: 0.2 },
    { criterion: contextCapacity, weight: 0.3 },  // larger context helps with codebases
  ],
  require: { tools: true },  // tool calling needed for structured code output
});
```

### Creative writing

A creative writing profile favors flagships (they tend to produce richer prose), excludes code-specialized models, and scores on writing-specific benchmarks:

```typescript
// Build a map from a creative writing benchmark field
const creativeScores = new Map<string, number>();
for (const entry of benchmarks) {
  creativeScores.set(entry.slug, entry.creative_writing_index);
}

const getCreative = aaScore(creativeScores);
const creativeBenchmark: ScoringCriterion = (model, allModels) => {
  const score = getCreative(model);
  const max = Math.max(...allModels.map(getCreative));
  return max > 0 ? score / max : 0;
};

recommend(models, {
  preferredTier: Tier.Flagship,
  criteria: [
    { criterion: creativeBenchmark, weight: 0.6 },
    { criterion: costEfficiency, weight: 0.1 },    // quality matters more than cost here
    { criterion: contextCapacity, weight: 0.3 },    // longer context for long-form writing
  ],
  exclude: {
    patterns: ["code", "coder", "codex"],  // skip code-specialized models
  },
});
```
