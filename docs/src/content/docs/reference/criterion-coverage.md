---
title: criterionCoverage
description: Report how many candidates each scoring criterion has data for.
---

A criterion that reads a field which exists for no candidate (a misspelled benchmark key, a paid-tier field on free-tier data) does not error. It silently contributes nothing, and the remaining criteria quietly take over the ranking. `criterionCoverage()` makes that visible: it reports, per criterion, how many candidates produced data.

```ts
function criterionCoverage<T extends Model>(
  models: T[],
  criteria: WeightedCriterion[],
): CriterionCoverage[]
```

## Returns

One [`CriterionCoverage`](/reference/types/#criterioncoverage) per criterion, in order: `{ label, covered, total }`. `label` comes from the weighted criterion's optional `label` field, falling back to the criterion's function name.

## Usage

Run it against your candidate set before trusting a ranking:

```ts
import { criterionCoverage, costEfficiency, minMaxCriterion, type Model } from "pickai";

// Enriched model type carrying external benchmark data
type BenchmarkedModel = Model & { tauBanking?: number };

const criteria = [
  { criterion: minMaxCriterion((m: BenchmarkedModel) => m.tauBanking), weight: 4, label: "tool-calling" },
  { criterion: costEfficiency, weight: 2, label: "cost" },
];

console.table(criterionCoverage(candidates, criteria));
// ┌─────────┬────────────────┬─────────┬───────┐
// │ (index) │ label          │ covered │ total │
// │ 0       │ 'tool-calling' │ 30      │ 122   │
// │ 1       │ 'cost'         │ 120     │ 122   │
// └─────────┴────────────────┴─────────┴───────┘
```

A criterion with `covered: 0` is dead weight: check the field it reads. [`recommend()`](/reference/recommend/) runs this check itself, reporting dead criteria through `onZeroCoverage` and throwing when every criterion is dead.

Per-model coverage (how much of one model's score is backed by data) is on each result as `ScoredModel.coverage`. See [Missing Data and Coverage](/concepts/scoring/#missing-data-and-coverage).
