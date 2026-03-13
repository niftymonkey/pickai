# Prior Iterations (1–4)

These iterations happened before the API pattern research and benchmark source analysis. Preserved for reference.

## Iteration 1: `createPicker({ models, benchmarks })`

Both sources passed at construction.

**Problem:** When you read `pick.recommend(Purpose.Coding)` you can't tell what data is informing the result. Are benchmarks loaded? Did they fail? The call site hides what's actually happening.

## Iteration 2: Two entry points — `createPicker()` and `createBenchmarkPicker()`

**Problem:** Too much ceremony. The user has to think about "which kind of picker do I have?" and the naming is clunky. The distinction should be simpler than a whole separate constructor.

## Iteration 3: One `createPicker()` with conditional return types

Returns `Picker` or `BenchmarkPicker` based on whether benchmarks were passed.

**Problem:** Same issue as #2 wearing a different hat. The user still has two different types to reason about, just hidden behind overloads. Too clever.

## Iteration 4: One `createPicker(source)`, benchmarks at `recommend()` call site

The proposal from sources-api-brief.md.

**Problem:** Silent degradation — a profile weighted 50% on coding benchmarks silently scores without them. Fixed by making missing benchmarks a hard error. But unresolved DX questions remain: is metadata-only `recommend()` actually useful? If every call needs benchmarks, you're passing the same object everywhere.

**Status:** Superseded by later iterations which incorporate research findings.
