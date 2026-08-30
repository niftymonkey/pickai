---
title: perModel
description: Constraint that limits entries per physical model in selection results.
---

The models.dev catalog lists the same physical model once per provider that serves it, including resellers and aggregators. Without deduplication, a top-10 can be wall-to-wall listings of a single model at different price points. `perModel()` creates a [constraint](/concepts/constraints/) that limits results to one entry (by default) per physical model.

```ts
function perModel(max?: number): Constraint
```

Model identity is resolved with [`matchesModel()`](/reference/matches-model/), so listings match across ID formats: provider prefixes, dot versus hyphen versions, and date suffixes all normalize to the same model.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `max` | `number` | `1` | Maximum entries per physical model. |

```ts
import { recommend, perModel } from "pickai";

// One slot per physical model: the best-scoring listing wins it
const results = recommend(models, profile, {
  constraints: [perModel(1)],
  limit: 10,
});
```

`perModel` differs from [`perFamily`](/reference/per-family/): `family` is a coarse tag (hundreds of models can share `"qwen"`), so `perFamily(1)` collapses distinct models. `perModel` collapses only listings of the same model.

See [Constraints](/concepts/constraints/) for the two-pass algorithm and custom constraint examples.
