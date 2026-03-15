---
title: recommend
description: Score and rank models using a purpose profile.
---

`recommend()` scores each model across multiple weighted dimensions and recommends the best fits for a given use case. This is what makes pickai more than a filter. See [Scoring & Ranking](/concepts/scoring/) and [Purpose Profiles](/concepts/purpose-profiles/) for the concepts behind it.

## Signature

```ts
function recommend<T extends Model>(
  models: T[],
  profile: PurposeProfile,
  options?: RecommendOptions,
): ScoredModel<T>[]
```

## Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `models` | `T[]` | The model array to score. |
| `profile` | `PurposeProfile` | Filter + weighted criteria defining the use case. |
| `options` | `RecommendOptions` | Optional additional filter, constraints, and limit. |

## RecommendOptions

```ts
interface RecommendOptions {
  filter?: ModelFilter | ((model: Model) => boolean);
  constraints?: Constraint[];
  limit?: number;
}
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `filter` | `ModelFilter \| function` | none | Additional filter AND-combined with the profile filter. |
| `constraints` | `Constraint[]` | none | Selection constraints (e.g., `perProvider`, `perFamily`). |
| `limit` | `number` | `1` | Number of models to return. |

## Returns

`ScoredModel<T>[]`: models with an added `score` property (0-1), sorted by score descending.

`ScoredModel<T>` preserves the input type. If you pass `Model[]`, you get `ScoredModel<Model>[]`. If you pass a custom type extending `Model`, the extra fields carry through.

## Pipeline

`recommend()` runs four steps in order:

1. **Profile filter:** applies `profile.filter` (if any). Deprecated models are excluded by default.
2. **Options filter:** applies `options.filter` (if any), narrowing the candidates further.
3. **Score:** evaluates each candidate against `profile.criteria`, producing a weighted score.
4. **Select:** picks the top `limit` models, respecting any `constraints`.

## Usage

```ts
import { fromModelsDev, recommend, Purpose, perProvider, DIRECT_PROVIDERS } from "pickai";

const models = await fromModelsDev();

// Single best model (default limit: 1)
const [best] = recommend(models, Purpose.Coding, {
  filter: { providers: [...DIRECT_PROVIDERS] },
});

// Top 5 with provider diversity
const diverse = recommend(models, Purpose.Coding, {
  filter: { providers: [...DIRECT_PROVIDERS] },
  constraints: [perProvider(1)],
  limit: 5,
});

// Narrow to a specific provider
const anthropic = recommend(models, Purpose.Balanced, {
  filter: { providers: ["anthropic"] },
  limit: 3,
});

// Returns empty array if no models match
const none = recommend(models, Purpose.Coding, {
  filter: { providers: ["nonexistent"] },
});
// => []
```
