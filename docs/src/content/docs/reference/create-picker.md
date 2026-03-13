---
title: createPicker
description: Create a picker instance from a model source.
---

## Signature

```ts
function createPicker(source: () => Promise<Model[]>): Promise<Picker>
```

## Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `source` | `() => Promise<Model[]>` | A thunk that loads model data. Called once at creation time. |

## Returns

`Promise<Picker>` — an object with `find()` and `recommend()` methods bound to the loaded model data.

## The Picker Interface

```ts
interface Picker {
  find(options?: FindOptions): Model[];
  recommend(profile: PurposeProfile, options?: RecommendOptions): ScoredModel[];
}
```

## Usage

```ts
import { createPicker, fromModelsDev } from "pickai";

// Using the built-in models.dev source
const pick = await createPicker(fromModelsDev());

// Using a custom source
const pick = await createPicker(async () => {
  const res = await fetch("https://my-api.com/models");
  return res.json();
});
```

## Behavior

- The source function is called exactly once during `createPicker()`.
- All subsequent `find()` and `recommend()` calls reuse the loaded data.
- If the source throws, `createPicker()` rejects with the same error.
