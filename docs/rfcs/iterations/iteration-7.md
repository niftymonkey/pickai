# Iteration 7: Standard Dimensions with Honest Source Boundaries

**Status:** Superseded by [Iteration 8](./iteration-8.md) — which removes benchmark infrastructure from the library's core.
**Derives from:** [Iteration 5](./iteration-5.md)
**What changed:** Resolved the benchmark source coupling concern. Profiles declare dimension requirements, source swaps produce clear errors instead of silent degradation, custom dimensions are fully supported.

## What This Iteration Adds to Iteration 5

Iteration 5 introduced standard benchmark dimensions (`BenchmarkDimension`) so profiles wouldn't reference source-specific field names. But it didn't address: **what happens when you swap benchmark sources and the new source doesn't provide the dimensions your profile needs?**

Three options were considered:

1. **Clear error on missing dimensions** — profile declares what it needs, source declares what it provides, mismatch is an error with actionable guidance.
2. **Graceful degradation with weight redistribution** — redistribute missing dimension weights across remaining dimensions.
3. **Don't ship benchmark-aware profiles** — only ship metadata-only profiles and a profile builder.

**Decision: Option 1.** See [Decisions and Rationale](#decisions-and-rationale) below for full reasoning.

## Full API Shape

Everything from Iteration 5 carries forward. Only the changes are shown here.

### BenchmarkDimension and BenchmarkScores

```typescript
// Standard dimensions — used by built-in profiles and shipped source functions
type BenchmarkDimension = "quality" | "coding" | "creative" | "math"
  | "instruction" | "reasoning" | "speed" | "multiturn"

// BenchmarkScores accepts any string key — standard or custom
interface BenchmarkScores {
  [modelId: string]: Record<string, number>  // not limited to BenchmarkDimension
}

// Profile benchmark weights reference string, not just BenchmarkDimension
// Built-in profiles use standard dimensions; custom profiles use whatever they want
interface BenchmarkWeight {
  dimension: string    // loose — accepts any dimension name
  weight: number
}
```

**Design rationale:**
- `BenchmarkDimension` is a convenience type for built-in profiles and source functions — it defines the "common vocabulary" that shipped components agree on.
- `BenchmarkScores` is `Record<string, number>`, not `Record<BenchmarkDimension, number>` — it accepts any key. A paid API that provides `"tool_accuracy"` or `"latency_p99"` just works.
- `BenchmarkWeight.dimension` is `string`, not `BenchmarkDimension` — custom profiles can reference any dimension name their data provides.
- The strong typing is in the *built-in path* (standard dimensions, shipped sources, shipped profiles all agree). The *custom path* is fully flexible.

### Source Function Dimension Declaration

Source functions declare what dimensions they provide. This enables the runtime check when `recommend()` validates a profile against the available data.

```typescript
interface BenchmarkResult {
  scores: BenchmarkScores
  dimensions: string[]  // what dimensions this source provides
}

// lmarena() returns:
// {
//   scores: { "claude-sonnet-4-5": { quality: 0.82, coding: 0.89, ... } },
//   dimensions: ["quality", "coding", "creative", "math", "instruction", "reasoning", "multiturn"]
// }

// artificialAnalysis() returns:
// {
//   scores: { "claude-sonnet-4-5": { quality: 0.85, speed: 0.72 } },
//   dimensions: ["quality", "speed"]
// }
```

### Error on Missing Dimensions

When `recommend()` is called with a profile that references dimensions not provided by the benchmark source:

```typescript
const benchmarks = await artificialAnalysis()
pick.recommend(Purpose.Coding, { benchmarks })
// Throws:
// PickaiError: Purpose.Coding requires benchmark dimensions not provided by your source.
//
//   Required:  coding, instruction, reasoning
//   Available: quality, speed
//   Missing:   coding, instruction, reasoning
//
//   Options:
//   - Use a source that provides these dimensions (e.g., lmarena())
//   - Use Purpose.Cheap or Purpose.Balanced (metadata-only, no benchmarks needed)
//   - Create a custom profile using only the dimensions your source provides
```

This is not silent degradation — the user knows exactly what broke and has concrete next steps.

### Custom Dimensions (Paid API Example)

Users with richer benchmark data can use any dimension names they want:

```typescript
import { createPicker, modelsDev, costEfficiency, contextCapacity } from "pickai"
import type { PurposeProfile, BenchmarkResult } from "pickai"

// User's custom source function — paid API with richer data
async function myBenchmarkProvider(): Promise<BenchmarkResult> {
  const data = await fetch("https://my-paid-api.com/benchmarks")
  const parsed = await data.json()
  return {
    scores: {
      "claude-sonnet-4-5": {
        coding: 0.89,
        tool_accuracy: 0.92,   // custom dimension
        latency_p99: 0.45,     // custom dimension
        agentic: 0.87,         // custom dimension
      },
      // ... more models
    },
    dimensions: ["coding", "tool_accuracy", "latency_p99", "agentic"],
  }
}

// Custom profile referencing both standard and custom dimensions
const MyAgentProfile: PurposeProfile = {
  filter: { toolCall: true, reasoning: true },
  criteria: [
    { criterion: contextCapacity, weight: 0.1 },
    { criterion: costEfficiency, weight: 0.05 },
  ],
  benchmarks: [
    { dimension: "coding", weight: 0.25 },        // standard dimension
    { dimension: "tool_accuracy", weight: 0.3 },   // custom dimension
    { dimension: "agentic", weight: 0.2 },          // custom dimension
    { dimension: "latency_p99", weight: 0.1 },      // custom dimension
  ],
}

const benchmarks = await myBenchmarkProvider()
pick.recommend(MyAgentProfile, { benchmarks, limit: 5 })
// Works — all referenced dimensions are in the source's dimensions list
```

### What Dimension Coverage Looks Like Across Sources

| Dimension | LMArena | Artificial Analysis | Both? |
|-----------|---------|---------------------|-------|
| `quality` | `overall` Elo | Intelligence Index | Yes |
| `speed` | — | output tokens/sec | AA only |
| `coding` | `coding` Elo | — | LMArena only |
| `creative` | `creative_writing` Elo | — | LMArena only |
| `math` | `math` Elo | — | LMArena only |
| `instruction` | `if` Elo | — | LMArena only |
| `reasoning` | `hard_6` Elo | — | LMArena only |
| `multiturn` | `multiturn` Elo | — | LMArena only |

**Lowest common denominator: `quality` only.** This means built-in profiles that reference anything beyond `quality` are effectively LMArena-dependent. This is a fact, not a problem to hide. The error message makes it clear.

### Built-in Profile Requirements

Unchanged from Iteration 5, but now explicitly documented as dimension requirements:

| Profile | Dimensions Required | Works with AA? | Works with LMArena? |
|---------|-------------------|----------------|---------------------|
| `Purpose.Cheap` | (none) | Yes | Yes |
| `Purpose.Balanced` | (none) | Yes | Yes |
| `Purpose.Coding` | coding, instruction, reasoning | No | **Yes** |
| `Purpose.Creative` | creative, instruction, multiturn | No | **Yes** |
| `Purpose.Quality` | quality, reasoning, instruction | No | **Yes** |
| `Purpose.Reasoning` | math, reasoning, coding, instruction | No | **Yes** |

This table is the honest answer to "can I swap sources?" — yes, for metadata-only profiles. For benchmark-aware profiles, you need a source that provides the right dimensions.

## Everything Else (Carried from Iteration 5)

The following are unchanged from Iteration 5 and are not repeated here. See [iteration-5.md](./iteration-5.md) for details:

- Basic usage pattern (`createPicker`, `find`, `recommend`)
- Built-in profile definitions and weights
- Scoring criteria (metadata-based): `costEfficiency`, `contextCapacity`, `recency`, `knowledgeFreshness`, `outputCapacity`
- Constraints: `perProvider(n)`, `perFamily(n)`, custom constraints
- Filter mechanism: `ModelFilter | ((model: Model) => boolean)`
- Spreadable presets pattern
- Custom profiles and custom criteria
- Model return type with AI SDK-ready IDs

## Decisions and Rationale

### Why Option 1 (clear error) over Option 2 (weight redistribution)

Weight redistribution IS silent degradation. We already decided in Iteration 4 that a profile weighted 50% on coding benchmarks can't silently score without them — results look correct but are fundamentally different. Redistribution just moves the failure from "missing data" to "misleading results." If a user asks for the best coding model and gets a generic quality ranking because coding benchmarks were silently dropped, that's worse than an error.

### Why Option 1 over Option 3 (no benchmark-aware profiles)

The whole value prop of pickai is that you don't need to be an expert in model evaluation to get good recommendations. Shipping only a profile builder says "here's a scoring engine, figure out the hard part yourself." That's a library for library authors. The built-in profiles are what make pickai useful out of the box.

### Why `BenchmarkWeight.dimension` is `string` not `BenchmarkDimension`

Custom profiles need to reference dimensions that pickai doesn't define. A paid API might provide `tool_accuracy`, `agentic`, `latency_p99` — these are legitimate scoring dimensions that pickai shouldn't gatekeep. `BenchmarkDimension` is a convenience for the built-in path, not a closed type.

### Why source functions return `dimensions` alongside `scores`

The runtime needs to know what a source provides *before* scoring, so it can validate profiles early. Without this, the error would only surface when a specific model is scored and happens to be missing a dimension — late, confusing, and potentially partial.

### Why benchmark-missing models score 0 (not excluded)

Decided in discussion before this iteration. Models in the catalog but not in the benchmark source score 0 for benchmark dimensions and still score on metadata criteria. They appear at the bottom of results rather than being excluded. Rationale: excluding them would mean `recommend()` returns a different model set depending on benchmark coverage, which is surprising. Scoring 0 is transparent — the model is there, it just ranks poorly on dimensions we can't measure.

## Open Questions (Iteration 7)

1. **LMArena reliability** — Community project, no official API. The raw JSON is ~10MB+. Fallback strategy? Options: bundle a snapshot, graceful fallback to metadata-only with a warning (not silent — logged), allow user to pass pre-fetched data.

2. **Caching** — Source functions fetch on every call. Cache with TTL? User's concern?

3. **Power-user primitives** — `scoreModels()`, `selectModels()`, `ScoringCriterion` — top-level exports, subpath, or folded into picker?

4. **Subpath exports** — `pickai/sources` replacing `pickai/adapters`? Or everything in `pickai`?

5. **ID matching** — Mapping between models.dev, LMArena, and AA IDs. Testing? Drift handling?

6. **Naming** — `createPicker`, `find`, `recommend` — fine for now.
