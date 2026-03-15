---
title: perProvider
description: Constraint that limits models per provider in selection results.
---

Without constraints, `recommend()` might return all results from a single provider because that provider's models scored highest. `perProvider()` creates a [constraint](/concepts/constraints/) that spreads results across providers.

```ts
function perProvider(max?: number): Constraint
```

Default: 1 per provider.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `max` | `number` | `1` | Maximum models per provider. |

```ts
import { recommend, Purpose, perProvider } from "pickai";

const results = recommend(models, Purpose.Quality, {
  constraints: [perProvider(2)],
  limit: 10,
});
```

See [Constraints](/concepts/constraints/) for the two-pass algorithm and custom constraint examples.
