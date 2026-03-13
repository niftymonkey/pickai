---
title: recommend
description: Score and rank models using a purpose profile.
---

## Signature

```ts
function recommend<T extends Model>(
  models: T[],
  profile: PurposeProfile,
  options?: RecommendOptions,
): ScoredModel<T>[]
```

Also available as `picker.recommend(profile, options?)` when using `createPicker()`.

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
| `filter` | `ModelFilter \| function` | — | Additional filter AND-combined with the profile filter. |
| `constraints` | `Constraint[]` | — | Selection constraints (e.g., `perProvider`, `perFamily`). |
| `limit` | `number` | `1` | Number of models to return. |

## Returns

`ScoredModel<T>[]` — models with an added `score` property (0–1), sorted by score descending.

`ScoredModel<T>` preserves the input type. If you pass `Model[]`, you get `ScoredModel<Model>[]`. If you pass a custom type extending `Model`, the extra fields carry through.

## Pipeline

`recommend()` runs four steps in order:

1. **Profile filter** — applies `profile.filter` (if any). Deprecated models are always excluded.
2. **Options filter** — applies `options.filter` (if any), narrowing the candidates further.
3. **Score** — evaluates each candidate against `profile.criteria`, producing a weighted score.
4. **Select** — picks the top `limit` models, respecting any `constraints`.

## Usage

```ts
import { Purpose, perProvider } from "pickai";

// Single best model (default limit: 1)
const [best] = pick.recommend(Purpose.Coding);

// Top 5 with provider diversity
const diverse = pick.recommend(Purpose.Quality, {
  constraints: [perProvider(1)],
  limit: 5,
});

// Narrow to a specific provider
const anthropic = pick.recommend(Purpose.Balanced, {
  filter: { providers: ["anthropic"] },
  limit: 3,
});

// Returns empty array if no models match
const none = pick.recommend(Purpose.Coding, {
  filter: { providers: ["nonexistent"] },
});
// => []
```
