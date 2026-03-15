---
title: find
description: Filter and sort models by metadata.
---

`find()` filters and sorts the catalog. It answers: "what's available that meets these requirements?" See [Filtering](/concepts/filtering/) for the full guide on declarative filters and predicates.

## Signature

```ts
function find(models: Model[], options?: FindOptions): Model[]
```

## Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `models` | `Model[]` | The model array to search. |
| `options` | `FindOptions` | Optional filter, sort, and limit. |

## FindOptions

```ts
interface FindOptions {
  filter?: ModelFilter | ((model: Model) => boolean);
  sort?: (a: Model, b: Model) => number;
  limit?: number;
}
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `filter` | `ModelFilter \| function` | none | Declarative filter object or predicate function. |
| `sort` | `function` | `sortByRecency("desc")` | Sort comparator. Use [built-in sort functions](#sort-functions) or a custom comparator. |
| `limit` | `number` | All results | Maximum number of results. |

## Sort Functions

pickai exports four sort functions. Each accepts `"asc"` or `"desc"` and returns a comparator.

| Function | Default | Sorts by |
|----------|---------|----------|
| `sortByCost(dir?)` | `"asc"` | Input cost per 1M tokens. Unknown pricing sorts last. |
| `sortByRecency(dir?)` | `"desc"` | Release date. Missing dates sort last. |
| `sortByContext(dir?)` | `"desc"` | Context window size. |
| `sortByOutput(dir?)` | `"desc"` | Output token limit. |

For anything else, pass a standard `Array.sort` comparator `(a, b) => number`.

## Returns

`Model[]`: filtered, sorted, and limited. Does not mutate the input array.

## Usage

```ts
import {
  fromModelsDev,
  find,
  sortByCost,
  sortByContext,
  DIRECT_PROVIDERS,
} from "pickai";

const models = await fromModelsDev();

// All reasoning models from direct providers, newest first (default sort)
const reasoning = find(models, {
  filter: { reasoning: true, providers: [...DIRECT_PROVIDERS] },
});

// Cheapest 5 models from direct providers
const cheap = find(models, {
  filter: { providers: [...DIRECT_PROVIDERS] },
  sort: sortByCost("asc"),
  limit: 5,
});

// Most expensive first
const pricey = find(models, {
  filter: { providers: [...DIRECT_PROVIDERS] },
  sort: sortByCost("desc"),
  limit: 5,
});

// Largest context window first
const big = find(models, {
  filter: { providers: [...DIRECT_PROVIDERS] },
  sort: sortByContext("desc"),
  limit: 3,
});

// Custom filter (without a providers filter, results include resellers)
const affordable = find(models, {
  filter: (m) => (m.cost?.input ?? 0) < 1,
  sort: (a, b) => b.limit.context - a.limit.context,
});
```
