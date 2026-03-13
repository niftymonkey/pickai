---
title: find
description: Filter and sort models by metadata.
---

## Signature

```ts
function find(models: Model[], options?: FindOptions): Model[]
```

Also available as `picker.find(options?)` when using `createPicker()`.

## Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `models` | `Model[]` | The model array to search. |
| `options` | `FindOptions` | Optional filter, sort, and limit. |

## FindOptions

```ts
interface FindOptions {
  filter?: ModelFilter | ((model: Model) => boolean);
  sort?: "costAsc" | ((a: Model, b: Model) => number);
  limit?: number;
}
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `filter` | `ModelFilter \| function` | — | Declarative filter object or predicate function. |
| `sort` | `"costAsc" \| function` | Recency (newest first) | Sort preset or custom comparator. |
| `limit` | `number` | All results | Maximum number of results. |

## Sort Options

- **Default (omitted):** Sorted by `releaseDate` descending (newest first). Models without a release date sort last.
- **`"costAsc"`:** Sorted by input cost ascending (cheapest first). Models without pricing are treated as $0.
- **Custom function:** Standard `Array.sort` comparator `(a, b) => number`.

## Returns

`Model[]` — filtered, sorted, and limited. Does not mutate the input array.

## Usage

```ts
// All reasoning models, newest first
const reasoning = pick.find({ filter: { reasoning: true } });

// Cheapest 5 models
const cheap = pick.find({ sort: "costAsc", limit: 5 });

// Custom sort: largest context window first
const big = pick.find({
  sort: (a, b) => b.limit.context - a.limit.context,
  limit: 3,
});

// Predicate filter
const affordable = pick.find({
  filter: (m) => (m.cost?.input ?? 0) < 1,
  sort: "costAsc",
});
```
