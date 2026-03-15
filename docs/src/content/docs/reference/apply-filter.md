---
title: applyFilter
description: Apply a declarative filter or predicate to a model array.
---

`find()` and `recommend()` both accept filters in their options. `applyFilter()` exposes the same filtering logic as a standalone function, useful when you want to filter a model array outside of those pipelines.

## Signature

```ts
function applyFilter<T extends Model>(
  models: T[],
  filter?: ModelFilter | ((model: Model) => boolean),
): T[]
```

## Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `models` | `T[]` | The model array to filter. |
| `filter` | `ModelFilter \| function` | Declarative filter object or predicate function. |

## Returns

`T[]`: a new array containing only models that pass the filter. Does not mutate the input. When `filter` is `undefined`, returns the input array unchanged.

Deprecated models are excluded by default (`excludeDeprecated` defaults to `true` in `ModelFilter`).

## Usage

```ts
import { fromModelsDev, applyFilter } from "pickai";

const models = await fromModelsDev();

const reasoning = applyFilter(models, { reasoning: true });
const cheap = applyFilter(models, (m) => (m.cost?.input ?? Infinity) < 1);
```

See [Filtering](/concepts/filtering/) for the full guide on declarative filters and predicates.
