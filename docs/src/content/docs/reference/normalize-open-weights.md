---
title: normalizeOpenWeights
description: Resolve openWeights consistently across provider entries of the same model.
---

Catalog metadata is reported per provider entry, and entries for the same physical model can disagree. A model whose weights are on HuggingFace may have `openWeights: true` on its `huggingface` entry and `false` on reseller entries. Any split into open-weight and hosted lists then depends on which entry wins.

`normalizeOpenWeights()` resolves the fact per model: if any entry for a model reports `openWeights: true`, every entry for that model gets `true`. Weights are either public or they are not.

```ts
function normalizeOpenWeights<T extends Model>(models: T[]): T[]
```

Model identity is resolved the same way as [`matchesModel()`](/reference/matches-model/). Entries of models with no `true` report are returned unchanged (including `undefined`, which stays unknown rather than becoming `false`).

```ts
import { fromModelsDev, normalizeOpenWeights } from "pickai";

const models = normalizeOpenWeights(await fromModelsDev());

const openWeight = models.filter((m) => m.openWeights);
const hosted = models.filter((m) => m.openWeights === false);
// The same physical model can no longer land in both lists.
// Entries with openWeights undefined are unknown, not hosted; handle
// them separately if your split needs to be exhaustive.
```

Run it once, right after loading the catalog, before any filtering or splitting that reads `openWeights`.
