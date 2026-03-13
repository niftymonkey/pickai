---
title: Scoring Criteria
description: Built-in scoring criteria and the scoreModels() composition function.
---

## Built-in Criteria

Each criterion is a `ScoringCriterion` — a function that takes a model and the full candidate list, returning a value from 0 to 1. All built-in criteria use min-max normalization, making scores relative to the candidate set.

### costEfficiency

```ts
const costEfficiency: ScoringCriterion
```

Cheaper models score higher. Based on `model.cost.input` (USD per 1M tokens). Models without pricing data are treated as $0 (free).

### recency

```ts
const recency: ScoringCriterion
```

Newer models score higher. Based on `model.releaseDate`. Models without a release date are treated as oldest (epoch).

### contextCapacity

```ts
const contextCapacity: ScoringCriterion
```

Larger context windows score higher. Based on `model.limit.context`.

### outputCapacity

```ts
const outputCapacity: ScoringCriterion
```

Larger output limits score higher. Based on `model.limit.output`.

### knowledgeFreshness

```ts
const knowledgeFreshness: ScoringCriterion
```

More recent knowledge cutoffs score higher. Based on `model.knowledge` (e.g., `"2025-03"`). Models without a knowledge cutoff are treated as oldest.

## ScoringCriterion Type

```ts
type ScoringCriterion = (model: Model, allModels: Model[]) => number;
```

| Parameter | Description |
|-----------|-------------|
| `model` | The model being scored. |
| `allModels` | The full candidate set (for relative scoring). |

Returns a number from 0 to 1. Higher is better.

## scoreModels()

The composition engine that combines weighted criteria into scored results.

```ts
function scoreModels<T extends Model>(
  models: T[],
  criteria: WeightedCriterion[],
): ScoredModel<T>[]
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `models` | `T[]` | Models to score. |
| `criteria` | `WeightedCriterion[]` | Criteria paired with weights. |

### Behavior

- Normalizes weights to sum to 1 (weight 7 and weight 3 become 0.7 and 0.3).
- Computes the weighted sum per model.
- Returns `ScoredModel<T>[]` sorted by score descending.
- All-zero weights produce all-zero scores.
- Empty input returns `[]`.

### WeightedCriterion

```ts
interface WeightedCriterion {
  criterion: ScoringCriterion;
  weight: number;
}
```

### Usage

```ts
import { scoreModels, costEfficiency, recency } from "pickai";

const scored = scoreModels(models, [
  { criterion: costEfficiency, weight: 3 },
  { criterion: recency, weight: 1 },
]);

// scored[0] is the highest-scoring model
console.log(scored[0].id, scored[0].score);
```
