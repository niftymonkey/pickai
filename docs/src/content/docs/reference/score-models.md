---
title: scoreModels
description: Score models using weighted criteria.
---

`recommend()` handles scoring internally, but `scoreModels()` exposes the scoring engine directly. Use it when you want to score models with custom criteria without the full recommend pipeline, or when building your own selection logic on top of scored results.

## Signature

```ts
function scoreModels<T extends Model>(
  models: T[],
  criteria: WeightedCriterion[],
): ScoredModel<T>[]
```

## Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `models` | `T[]` | Models to score. |
| `criteria` | `WeightedCriterion[]` | Criteria paired with weights. |

## Returns

`ScoredModel<T>[]`: models with an added `score` property (0-1), sorted by score descending.

## Behavior

- Normalizes weights to sum to 1 (weight 7 and weight 3 become 0.7 and 0.3).
- Computes the weighted sum per model.
- All-zero weights produce all-zero scores.
- Empty input returns `[]`.

## Usage

```ts
import { scoreModels, costEfficiency, recency } from "pickai";

const scored = scoreModels(models, [
  { criterion: costEfficiency, weight: 3 },
  { criterion: recency, weight: 1 },
]);

console.log(scored[0].name, scored[0].score);
```

See [Scoring & Ranking](/concepts/scoring/) for how criteria and weights work together.

## Built-in Criteria

All built-in criteria use min-max normalization across the candidate set. Scores are relative to the other candidates.

### costEfficiency

```ts
const costEfficiency: ScoringCriterion
```

Cheaper models score higher. Based on `model.cost.input` (USD per 1M tokens). Models without pricing data score 0 (unknown cost gets no credit for being cheap).

### recency

```ts
const recency: ScoringCriterion
```

Newer models score higher. Based on `model.releaseDate`. Models without a release date are treated as oldest.

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

## minMaxCriterion

Helper for creating custom min-max normalized criteria. Reduces the boilerplate of extracting values, filtering nulls, and normalizing.

```ts
function minMaxCriterion(
  getValue: (model: Model) => number | undefined,
  invert?: boolean,
): ScoringCriterion
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `getValue` | `function` | required | Extracts a numeric value from a model, or `undefined` if unavailable. |
| `invert` | `boolean` | `false` | If `true`, lower values score higher (useful for cost). |

Models where `getValue` returns `undefined` score 0.

```ts
import { minMaxCriterion, matchesModel } from "pickai";

// Score models by external benchmark data
const arenaScore = minMaxCriterion((model) => {
  const match = benchmarks.find((b) => matchesModel(b.modelId, model.id));
  return match?.score;
});

// Score models by cost (cheaper = higher score)
const cheapest = minMaxCriterion((model) => model.cost?.input, true);
```

See the [Benchmark Scoring](/examples/benchmark-scoring/) example for a full working implementation.
