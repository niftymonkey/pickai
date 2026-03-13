---
title: Constraints
description: Built-in selection constraints and the selectModels() function.
---

## Built-in Constraints

### perProvider

```ts
function perProvider(max?: number): Constraint
```

Limits how many models from the same provider appear in results.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `max` | `number` | `1` | Maximum models per provider. |

### perFamily

```ts
function perFamily(max?: number): Constraint
```

Limits how many models from the same family appear in results. Models without a `family` field always pass.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `max` | `number` | `1` | Maximum models per family. |

## Constraint Type

```ts
type Constraint = (selected: Model[], candidate: Model) => boolean;
```

| Parameter | Description |
|-----------|-------------|
| `selected` | Models already selected in this pass. |
| `candidate` | The model being considered for selection. |

Return `true` to allow the candidate, `false` to skip it during the first selection pass.

## selectModels()

The selection engine used internally by `recommend()`. Exported for advanced use cases.

```ts
function selectModels<T extends Model>(
  scored: ScoredModel<T>[],
  options?: SelectOptions,
): ScoredModel<T>[]
```

### SelectOptions

```ts
interface SelectOptions {
  limit?: number;
  constraints?: Constraint[];
}
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `limit` | `number` | `1` | Number of models to select. |
| `constraints` | `Constraint[]` | `[]` | Constraints applied during selection. |

### Two-Pass Algorithm

1. **First pass:** Walk scored models in order. Add to result if all constraints pass.
2. **Second pass:** If result has fewer than `limit` models, fill from remaining models, ignoring constraints.

This guarantees `limit` results (when enough candidates exist) while preferring diversity.

### Usage

```ts
import { scoreModels, selectModels, costEfficiency, perProvider } from "pickai";

const scored = scoreModels(models, [{ criterion: costEfficiency, weight: 1 }]);

const selected = selectModels(scored, {
  limit: 5,
  constraints: [perProvider(1)],
});
```
