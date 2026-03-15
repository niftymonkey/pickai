---
title: perFamily
description: Constraint that limits models per family in selection results.
---

Without constraints, `recommend()` might return multiple models from the same `model.family` (e.g., three `grok` models or two `claude-sonnet` versions). `perFamily()` creates a [constraint](/concepts/constraints/) that limits how many models sharing the same family value appear in results.

```ts
function perFamily(max?: number): Constraint
```

Models without a `family` field always pass and are not counted against any group. Default: 1 per family.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `max` | `number` | `1` | Maximum models per family. |

```ts
import { recommend, Purpose, perFamily } from "pickai";

const results = recommend(models, Purpose.Balanced, {
  constraints: [perFamily(1)],
  limit: 5,
});
```

See [Constraints](/concepts/constraints/) for the two-pass algorithm and custom constraint examples.
