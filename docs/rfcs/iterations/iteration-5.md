# Iteration 5: Clean Slate — Two Methods for Two Jobs

**Status:** Superseded by [Iteration 7](./iteration-7.md) — which resolves the benchmark source coupling concern.

Leans into the research finding that filtering and ranking are separate jobs. One entry point, two query methods, options objects throughout.

## Basic Usage

```typescript
import { createPicker, modelsDev, lmarena, Purpose } from "pickai"

// Source function handles fetch + parse boilerplate
const pick = await createPicker(modelsDev())

// Job 1: "What should I even consider?"
// Metadata-only filtering and sorting — no scoring
const candidates = pick.find({
  filter: {
    reasoning: true,
    structuredOutput: true,
    maxCostInput: 10,
  },
  limit: 20,
})

// Job 2: "Help the user choose well."
// Scored ranking with benchmark data
const benchmarks = await lmarena()
const best = pick.recommend(Purpose.Coding, {
  benchmarks,
  limit: 5,
})

// Both methods return models with AI SDK-ready IDs
best[0].id          // "claude-sonnet-4-5" (AI SDK model ID)
best[0].provider    // "anthropic"
best[0].sdk         // "@ai-sdk/anthropic" (AI SDK provider package)
best[0].score       // 0.87 (only present on recommend results)
```

## Built-in Purpose Profiles

Profiles are the pre-defined scoring strategies. Each profile specifies metadata criteria (always available) and optionally benchmark criteria (require benchmark data). Profiles that reference benchmarks throw if benchmarks aren't provided — no silent degradation.

Profiles reference pickai's **standard benchmark dimensions**, not source-specific field names. Source functions map their data to these dimensions internally (e.g., LMArena's `"if"` category maps to pickai's `"instruction"` dimension).

```typescript
// pickai's standard benchmark dimensions
type BenchmarkDimension =
  | "quality"         // overall model quality
  | "coding"          // code generation/understanding
  | "creative"        // creative writing
  | "math"            // mathematical reasoning
  | "instruction"     // instruction following
  | "reasoning"       // hard/complex prompts
  | "speed"           // output tokens/sec
  | "multiturn"       // multi-turn conversation
```

```typescript
// METADATA-ONLY PROFILES — work without benchmarks

const Cheap: PurposeProfile = {
  // "Give me the cheapest model that works"
  criteria: [
    { criterion: costEfficiency, weight: 0.7 },
    { criterion: contextCapacity, weight: 0.3 },
  ],
}

const Balanced: PurposeProfile = {
  // "Give me a good all-rounder"
  criteria: [
    { criterion: costEfficiency, weight: 0.25 },
    { criterion: recency, weight: 0.25 },
    { criterion: contextCapacity, weight: 0.25 },
    { criterion: knowledgeFreshness, weight: 0.25 },
  ],
}

// BENCHMARK-AWARE PROFILES — require benchmark data

const Coding: PurposeProfile = {
  // "Give me the best model for code generation"
  filter: { toolCall: true },
  criteria: [
    { criterion: contextCapacity, weight: 0.15 },
    { criterion: costEfficiency, weight: 0.1 },
  ],
  benchmarks: [
    { dimension: "coding", weight: 0.5 },
    { dimension: "instruction", weight: 0.15 },
    { dimension: "reasoning", weight: 0.1 },
  ],
}

const Creative: PurposeProfile = {
  // "Give me the best model for creative writing"
  criteria: [
    { criterion: contextCapacity, weight: 0.15 },
    { criterion: costEfficiency, weight: 0.05 },
  ],
  benchmarks: [
    { dimension: "creative", weight: 0.6 },
    { dimension: "instruction", weight: 0.1 },
    { dimension: "multiturn", weight: 0.1 },
  ],
}

const Quality: PurposeProfile = {
  // "Give me the absolute best model regardless of cost"
  criteria: [
    { criterion: contextCapacity, weight: 0.1 },
  ],
  benchmarks: [
    { dimension: "quality", weight: 0.6 },
    { dimension: "reasoning", weight: 0.2 },
    { dimension: "instruction", weight: 0.1 },
  ],
}

const Reasoning: PurposeProfile = {
  // "Give me the best model for complex reasoning tasks"
  filter: { reasoning: true },
  criteria: [
    { criterion: contextCapacity, weight: 0.1 },
    { criterion: costEfficiency, weight: 0.05 },
  ],
  benchmarks: [
    { dimension: "math", weight: 0.35 },
    { dimension: "reasoning", weight: 0.3 },
    { dimension: "coding", weight: 0.15 },
    { dimension: "instruction", weight: 0.05 },
  ],
}
```

**Key profile design decisions:**
- Profiles no longer have `preferredTier` — tier was a proxy for quality when we didn't have real quality data. With benchmarks, tier is unnecessary. Cost is handled by `costEfficiency` criterion weight.
- Profiles can embed filters (e.g., Coding requires `toolCall`, Reasoning requires `reasoning`). These merge with user-provided filters.
- `benchmarks` field references pickai's standard `BenchmarkDimension` names, not source-specific fields. Source functions handle the mapping.
- Metadata criteria weights + benchmark weights must sum to 1.0. The split signals how much the profile relies on benchmarks.

**Profile summary:**

| Profile | Metadata Weight | Benchmark Weight | Dimensions Used | Needs Benchmarks? |
|---------|----------------|-----------------|-----------------|-------------------|
| `Purpose.Cheap` | 100% | 0% | — | No |
| `Purpose.Balanced` | 100% | 0% | — | No |
| `Purpose.Coding` | 25% | 75% | coding, instruction, reasoning | **Yes** |
| `Purpose.Creative` | 20% | 80% | creative, instruction, multiturn | **Yes** |
| `Purpose.Quality` | 10% | 90% | quality, reasoning, instruction | **Yes** |
| `Purpose.Reasoning` | 15% | 85% | math, reasoning, coding, instruction | **Yes** |

## Scoring Criteria (Metadata-Based)

Built-in criteria that score models using only models.dev metadata. Each returns a 0-1 normalized score.

```typescript
// CARRIED FROM v1
const costEfficiency: ScoringCriterion     // cheaper input+output = higher
const contextCapacity: ScoringCriterion    // larger context window = higher
const recency: ScoringCriterion            // more recent release_date = higher

// NEW — enabled by models.dev's richer metadata
const knowledgeFreshness: ScoringCriterion // more recent knowledge cutoff = higher
const outputCapacity: ScoringCriterion     // larger output limit = higher
```

**Dropped from v1:**
- `versionFreshness` — extracted version numbers from model IDs. Fragile heuristic. `recency` (release_date) is more reliable and models.dev always has it.
- `tierFit(targetTier)` — scored proximity to a preferred tier. Tier was a proxy for quality. With real benchmark data, this is no longer needed as a scoring criterion.

**Why not criteria for capabilities (reasoning, tools, structured output)?**
Capabilities are boolean — a model either supports reasoning or it doesn't. You can't score "how much does it support reasoning." These belong in the **filter**, not in scoring criteria. This is the filter/rank separation from the research.

## Constraints (Post-Scoring Selection)

Constraints control which models make the final cut after scoring. They don't affect scores — they affect selection from the scored list.

```typescript
import { perProvider, perFamily } from "pickai"

// Provider diversity — at most N models from any single provider
pick.recommend(Purpose.Coding, {
  benchmarks,
  constraints: [perProvider(1)],
  limit: 5,
})
// Result: top coding models, but max 1 from Anthropic, 1 from OpenAI, etc.

// Family diversity — at most N models from any model family
pick.recommend(Purpose.Quality, {
  benchmarks,
  constraints: [perFamily(1)],
  limit: 5,
})
// Result: top quality models, but max 1 Claude, 1 GPT, 1 Gemini family, etc.
// Uses models.dev's `family` field: "claude-opus", "claude-sonnet", "gpt", "gemini"

// Combine constraints
pick.recommend(Purpose.Balanced, {
  constraints: [perProvider(2), perFamily(1)],
  limit: 10,
})

// Custom constraint — same function signature as v1
const noFreeTier: Constraint = (selected, candidate) =>
  candidate.cost?.input > 0

pick.recommend(Purpose.Balanced, {
  constraints: [perProvider(1), noFreeTier],
  limit: 5,
})
```

**Design decision:** Constraints are composable functions, not boolean flags. `providerDiversity: true` from v1 becomes `constraints: [perProvider(1)]`. More flexible — you can set the max per provider, combine with family diversity, or write custom constraints. The `perFamily()` constraint is new and leverages models.dev's `family` field.

**Constraint algorithm (carried from v1):**
1. First pass: select top-scored models that satisfy all constraints
2. Second pass: if count not met, fill remaining slots ignoring constraints
3. This ensures you always get `limit` results, even if constraints are restrictive

## Filter Mechanism

The same filter works in both `find()` and `recommend()`. Accepts either a declarative object or a predicate function.

```typescript
// Declarative filter (common case)
const filter = { reasoning: true, toolCall: true, maxCostInput: 10 }
pick.find({ filter, limit: 20 })
pick.recommend(Purpose.Coding, { filter, benchmarks, limit: 5 })

// Predicate function (escape hatch for complex logic)
pick.find({
  filter: (model) => model.provider === 'anthropic' && model.cost.input < 5,
  limit: 10,
})
```

**Declarative filter options:**
```typescript
interface ModelFilter {
  // Capability requirements (boolean fields from models.dev)
  reasoning?: boolean
  toolCall?: boolean
  structuredOutput?: boolean
  openWeights?: boolean
  attachment?: boolean

  // Cost bounds (per million tokens, USD)
  maxCostInput?: number
  maxCostOutput?: number

  // Context bounds
  minContext?: number
  minOutput?: number

  // Provider filtering
  providers?: string[]          // include only these providers
  excludeProviders?: string[]   // exclude these providers

  // Modality filtering
  inputModalities?: string[]    // require these input modalities
  outputModalities?: string[]   // require these output modalities

  // Status
  excludeDeprecated?: boolean   // default: true

  // Knowledge cutoff
  minKnowledge?: string         // "2024-06" — exclude models with older training data
}
```

`filter` accepts `ModelFilter | ((model: Model) => boolean)` — one key, two modes. No separate `where` key needed.

## Spreadable Presets (from TanStack Query pattern)

```typescript
// Define reusable option presets
const codingDefaults = {
  filter: { reasoning: true, toolCall: true, structuredOutput: true },
  constraints: [perProvider(1)],
  limit: 5,
}

// Spread and override per call
pick.recommend(Purpose.Coding, { ...codingDefaults, benchmarks })
pick.recommend(Purpose.Coding, { ...codingDefaults, benchmarks, limit: 10 })
pick.find({ filter: codingDefaults.filter, limit: 20 })
```

## Custom Profiles

Users can define their own profiles for domain-specific use cases:

```typescript
import { costEfficiency, contextCapacity } from "pickai"

const MyAgentProfile: PurposeProfile = {
  filter: { toolCall: true, reasoning: true, structuredOutput: true },
  criteria: [
    { criterion: contextCapacity, weight: 0.2 },
    { criterion: costEfficiency, weight: 0.1 },
  ],
  benchmarks: [
    { dimension: "coding", weight: 0.3 },
    { dimension: "instruction", weight: 0.25 },
    { dimension: "reasoning", weight: 0.15 },
  ],
}

pick.recommend(MyAgentProfile, { benchmarks, limit: 3 })
```

## Custom Criteria

Users can write their own scoring criteria. A criterion is a function that takes a model and the full model set, and returns a 0-1 score.

```typescript
import type { ScoringCriterion, PurposeProfile } from "pickai"

// Custom criterion: prefer models with cache pricing (cheaper for repeated context)
const cacheAvailability: ScoringCriterion = (model) =>
  model.cost?.cacheRead != null ? 1 : 0

// Custom criterion: prefer models with larger output limits (for generation tasks)
const generationCapacity: ScoringCriterion = (model, allModels) => {
  const maxOutput = Math.max(...allModels.map(m => m.limit.output))
  return model.limit.output / maxOutput
}

const LongFormWriter: PurposeProfile = {
  criteria: [
    { criterion: generationCapacity, weight: 0.4 },
    { criterion: cacheAvailability, weight: 0.2 },
    { criterion: costEfficiency, weight: 0.1 },
  ],
  benchmarks: [
    { dimension: "creative", weight: 0.3 },
  ],
}
```

## Benchmark Source Functions

Source functions eliminate the boilerplate of fetching, parsing, normalizing, and ID-matching external data. Each source maps its data to pickai's standard types.

```typescript
import { modelsDev, lmarena, artificialAnalysis } from "pickai"

// Model catalog source — fetches and parses models.dev/api.json
const pick = await createPicker(modelsDev())

// Benchmark sources — fetch and normalize to standard BenchmarkDimension keys
const benchmarks = await lmarena()              // per-category Elo → standard dimensions
const aaBenchmarks = await artificialAnalysis() // intelligence index + speed → standard dimensions

// Both return the same BenchmarkScores shape using pickai's standard dimensions
pick.recommend(Purpose.Coding, { benchmarks })
pick.recommend(Purpose.Quality, { benchmarks: aaBenchmarks })
```

**BenchmarkScores type:**
```typescript
interface BenchmarkScores {
  [modelId: string]: Partial<Record<BenchmarkDimension, number>>  // normalized 0-1
}

// lmarena() maps:
//   LMArena "coding"          → pickai "coding"
//   LMArena "creative_writing" → pickai "creative"
//   LMArena "if"              → pickai "instruction"
//   LMArena "hard_6"          → pickai "reasoning"
//   LMArena "math"            → pickai "math"
//   LMArena "overall"         → pickai "quality"
//   LMArena "multiturn"       → pickai "multiturn"

// artificialAnalysis() maps:
//   AA intelligence_index     → pickai "quality"
//   AA output_speed           → pickai "speed"
```

**Key design:** Source functions normalize both scores (to 0-1) and dimension names (to pickai's standard set) internally. This means:
- Profiles are source-agnostic — they reference pickai dimensions, not LMArena categories
- Users can write their own source function that maps custom benchmark data to the standard dimensions
- Built-in profiles work with any source that provides the dimensions they reference

**ID matching:** Source functions handle matching their model IDs to models.dev IDs internally. `lmarena()` maps `claude-3-5-sonnet-20241022` → `claude-sonnet-4-5`. This is significant hidden complexity the library absorbs.

**Models without benchmark data:** When `recommend()` uses a benchmark-aware profile, models that exist in the catalog but not in the benchmark source score 0 for benchmark dimensions. They still score on metadata criteria, so they appear at the bottom of results rather than being excluded entirely.

## Open Questions (Iteration 5)

1. **Naming** — `createPicker`, `find`, `recommend` — fine for now, revisit if a future iteration reveals a reason to change.

2. **LMArena as a source** — No official public API. Data is accessible via a community GitHub project (nakasyou/lmarena-history, MIT license) that converts HuggingFace pickle → JSON daily. The raw JSON file is publicly accessible at `raw.githubusercontent.com` (no auth). This is less robust than models.dev's proper API endpoint. Fallback strategy needed.

3. **Caching** — Source functions fetch on every call. Should `modelsDev()` and `lmarena()` cache? TTL-based? Or is caching the user's concern?

4. **Power-user primitives** — `scoreModels()`, `selectModels()`, `ScoringCriterion` — are these still top-level exports alongside the picker, or does the picker subsume them?

5. **Subpath exports** — `pickai/sources` replacing `pickai/adapters`? Or fold everything into `pickai`?

6. **ID matching complexity** — Source functions must map between models.dev IDs, LMArena IDs, and AA IDs. How do we test it? How do we handle drift?

7. **Standard dimension coverage** — What if a benchmark source doesn't provide all dimensions a profile needs? Currently we'd throw (same as missing benchmarks entirely). Should we score missing dimensions as 0 instead, re-normalizing remaining weights?
