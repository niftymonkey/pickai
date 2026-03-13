# Iteration 6: Evolution of v1 — Same Two Methods, v1 Concepts Preserved

**Status:** Presented for comparison. Not actively being developed.

Same two-method structure as Iteration 5, but preserves v1 naming conventions and keeps the composable scoring primitives as a power-user escape hatch.

## Usage

```typescript
import { createPicker, modelsDev, artificialAnalysis, Purpose } from "pickai"

const pick = await createPicker(modelsDev())

// Job 1: filtering (new in v2)
const candidates = pick.find({
  reasoning: true,
  structuredOutput: true,
  maxCostInput: 10,
  limit: 20,
})

// Job 2: recommendation (evolved from v1 recommend())
const benchmarks = await artificialAnalysis()
const best = pick.recommend(Purpose.Coding, {
  benchmarks,
  count: 5,              // v1 naming preserved
  providerDiversity: true, // v1 option preserved
  textOnly: true,         // v1 option preserved
})

// Power-user path: v1 scoring primitives still available
import { scoreModels, costEfficiency, contextCapacity } from "pickai"
const custom = scoreModels(candidates, [
  { criterion: costEfficiency, weight: 0.5 },
  { criterion: contextCapacity, weight: 0.5 },
])
```

## Key Differences from Iteration 5

- `find()` filter options are flat (not nested under a `filter` key)
- `recommend()` keeps v1's `count`, `providerDiversity`, `textOnly` options
- `scoreModels()` and composable criteria remain exported for users who want full control
- More familiar to existing v1 users, lower migration burden

## What's Good

Smooth upgrade path from v1. Power users can still compose their own scoring. Flat filter options on `find()` are simpler for the common case.

## What's Uncertain

- Flat filter options on `find()` don't compose as well — you can't spread a shared filter into `recommend()`
- `providerDiversity` and `textOnly` on `recommend()` are really filtering concerns, not scoring concerns — should they be part of the filter instead?
- Having `scoreModels()` as a separate export alongside `pick.recommend()` creates two ways to do the same thing
- Doesn't address the benchmark dimension abstraction problem (profiles would reference source-specific field names)
