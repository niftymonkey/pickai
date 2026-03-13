# Iteration 8: Metadata-First, Benchmarks as BYOD

**Status:** Active
**Derives from:** [Iteration 7](./iteration-7.md)
**What changed:** Removed benchmark infrastructure from the library's core. Benchmarks are no longer a built-in feature — they're a documented pattern using the existing `ScoringCriterion` interface. All built-in profiles work out of the box with metadata only. One external dependency: models.dev.

## Why This Iteration Exists

Iterations 5-7 built increasingly elaborate benchmark infrastructure: standard dimensions, source functions, dimension validation, actionable error messages, `BenchmarkResult` types. Each layer solved a real problem but introduced new coupling:

- Built-in profiles only worked with specific benchmark sources
- Swapping sources could break profiles silently or with confusing errors
- The library's reliability depended on third-party community projects with no official APIs
- The API surface grew to accommodate a feature that most users would need to configure heavily anyway

The realization: **models.dev metadata alone solves the core problems pickai was built for.** Filtering by capabilities, scoring by cost/context/recency/knowledge freshness, returning AI SDK-ready IDs — that's the value prop. Benchmarks answer a different question ("which is actually best at coding?") that's better served by the user's own evaluation pipeline.

## Full API Shape

### Construction

```typescript
import { createPicker, modelsDev } from "pickai"

// One source, one call — models.dev handles the catalog
const pick = await createPicker(modelsDev())

// Or with pre-fetched data (offline, testing, custom source)
import fs from "node:fs"
const myData = JSON.parse(fs.readFileSync('./models-snapshot.json', 'utf8'))
const pick = await createPicker(modelsDev(myData))
```

### Job 1: Discovery — `find()`

"What should I even consider?" Metadata-only filtering and sorting. Results are sorted by recency (most recent `release_date` first) by default, since newer models are generally more relevant. An optional `sort` parameter accepts a field name or custom comparator.

```typescript
// Declarative filter — results sorted by recency (default)
const candidates = pick.find({
  filter: {
    reasoning: true,
    structuredOutput: true,
    maxCostInput: 10,
  },
  limit: 20,
})

// Sort by cost instead
const cheapest = pick.find({
  filter: { reasoning: true },
  sort: "costAsc",
  limit: 10,
})

// Custom sort
const byContext = pick.find({
  filter: { reasoning: true },
  sort: (a, b) => b.limit.context - a.limit.context,
  limit: 10,
})

// Predicate filter (escape hatch for complex logic)
const anthropicModels = pick.find({
  filter: (model) => model.provider === 'anthropic' && model.cost.input < 5,
  limit: 10,
})
```

### Job 2: Recommendation — `recommend()`

"Help me choose." Scored ranking using weighted criteria.

```typescript
import { Purpose } from "pickai"

// Built-in profile — works immediately, no external data needed
const best = pick.recommend(Purpose.Coding, { limit: 5 })

// With constraints
import { perProvider, perFamily } from "pickai"

const diverse = pick.recommend(Purpose.Coding, {
  constraints: [perProvider(1), perFamily(1)],
  limit: 5,
})
```

### Shared Filter Mechanism

The same filter works in both methods:

```typescript
const filter = { reasoning: true, toolCall: true, maxCostInput: 10 }

pick.find({ filter, limit: 20 })
pick.recommend(Purpose.Coding, { filter, limit: 5 })
```

Filter accepts `ModelFilter | ((model: Model) => boolean)`:

```typescript
interface ModelFilter {
  // Capability requirements
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
  providers?: string[]
  excludeProviders?: string[]

  // Modality filtering
  inputModalities?: string[]
  outputModalities?: string[]

  // Status
  excludeDeprecated?: boolean   // default: true

  // Knowledge cutoff
  minKnowledge?: string         // "2024-06"
}
```

### Built-in Purpose Profiles

All profiles are metadata-only. All work out of the box. No external data required.

Weights are relative — `5` means five times as important as `1`. The engine normalizes them automatically. Users don't need to make them add up to anything. This matches the industry convention (Fuse.js, Elasticsearch, scikit-learn).

```typescript
const Cheap: PurposeProfile = {
  // "Cheapest model that works"
  criteria: [
    { criterion: costEfficiency, weight: 7 },
    { criterion: contextCapacity, weight: 3 },
  ],
}

const Balanced: PurposeProfile = {
  // "Good all-rounder"
  criteria: [
    { criterion: costEfficiency, weight: 1 },
    { criterion: recency, weight: 1 },
    { criterion: contextCapacity, weight: 1 },
    { criterion: knowledgeFreshness, weight: 1 },
  ],
}

const Quality: PurposeProfile = {
  // "Best available, cost is secondary"
  criteria: [
    { criterion: recency, weight: 5 },
    { criterion: knowledgeFreshness, weight: 3 },
    { criterion: contextCapacity, weight: 2 },
    { criterion: costEfficiency, weight: 1 },
  ],
}

const Coding: PurposeProfile = {
  // "Best for code generation — filters to capable models, scores on metadata"
  filter: { toolCall: true, structuredOutput: true },
  criteria: [
    { criterion: recency, weight: 4 },
    { criterion: knowledgeFreshness, weight: 3 },
    { criterion: contextCapacity, weight: 3 },
    { criterion: costEfficiency, weight: 1 },
  ],
}

const Creative: PurposeProfile = {
  // "Best for creative writing — large context, recent, cost secondary"
  criteria: [
    { criterion: contextCapacity, weight: 4 },
    { criterion: recency, weight: 3 },
    { criterion: knowledgeFreshness, weight: 2 },
    { criterion: costEfficiency, weight: 1 },
  ],
}

const Reasoning: PurposeProfile = {
  // "Best for complex reasoning — filters to reasoning models"
  filter: { reasoning: true },
  criteria: [
    { criterion: recency, weight: 5 },
    { criterion: knowledgeFreshness, weight: 3 },
    { criterion: contextCapacity, weight: 2 },
    { criterion: costEfficiency, weight: 1 },
  ],
}
```

**Profile summary:**

| Profile | Filter | Top Signal | Needs External Data? |
|---------|--------|------------|---------------------|
| `Purpose.Cheap` | — | Cost efficiency | No |
| `Purpose.Balanced` | — | Equal weight across all | No |
| `Purpose.Quality` | — | Recency + knowledge | No |
| `Purpose.Coding` | toolCall, structuredOutput | Recency + knowledge + context | No |
| `Purpose.Creative` | — | Context capacity | No |
| `Purpose.Reasoning` | reasoning | Recency + knowledge | No |

**Note on metadata-only quality signals:** Without benchmarks, recency and knowledge freshness are the best proxies for quality — newer models from the same family are generally better. This is an imperfect heuristic. Users who need actual quality ranking should add benchmark data via custom criteria (see examples below).

### Scoring Criteria

Built-in criteria that score models using models.dev metadata. Each returns a 0-1 normalized score (min-max normalized against the current model set).

```typescript
// Carried from v1
const costEfficiency: ScoringCriterion     // cheaper input+output = higher
const contextCapacity: ScoringCriterion    // larger context window = higher
const recency: ScoringCriterion            // more recent release_date = higher

// New — enabled by models.dev
const knowledgeFreshness: ScoringCriterion // more recent knowledge cutoff = higher
const outputCapacity: ScoringCriterion     // larger output limit = higher
```

**Dropped from v1:**
- `versionFreshness` — fragile heuristic that parsed version numbers from IDs. `recency` is more reliable.
- `tierFit(targetTier)` — tier was a proxy for quality. No longer needed as a scoring concept.

### Constraints

Composable functions that control selection from scored results. Don't affect scores — affect which models make the cut.

```typescript
import { perProvider, perFamily } from "pickai"

pick.recommend(Purpose.Coding, {
  constraints: [perProvider(1)],   // max 1 per provider
  limit: 5,
})

pick.recommend(Purpose.Quality, {
  constraints: [perFamily(1)],     // max 1 per model family
  limit: 5,
})

// Custom constraint
const noBeta: Constraint = (selected, candidate) =>
  candidate.status !== 'beta'

pick.recommend(Purpose.Balanced, {
  constraints: [perProvider(1), noBeta],
  limit: 5,
})
```

**Algorithm (carried from v1):**
1. First pass: select top-scored models satisfying all constraints
2. Second pass: fill remaining slots ignoring constraints
3. Always returns `limit` results

### Custom Profiles

```typescript
import { costEfficiency, contextCapacity, recency } from "pickai"

const MyAgentProfile: PurposeProfile = {
  filter: { toolCall: true, reasoning: true, structuredOutput: true },
  criteria: [
    { criterion: contextCapacity, weight: 3 },
    { criterion: recency, weight: 2 },
    { criterion: costEfficiency, weight: 1 },
  ],
}

pick.recommend(MyAgentProfile, { limit: 3 })
```

### Custom Criteria

A criterion is a function: `(model, allModels) => number` returning 0-1. This is the extension point for any external data, including benchmarks.

```typescript
import type { ScoringCriterion } from "pickai"

// Custom criterion: prefer models with cache pricing
const cacheAvailability: ScoringCriterion = (model) =>
  model.cost?.cacheRead != null ? 1 : 0

// Custom criterion: prefer models from a specific family
const preferClaude: ScoringCriterion = (model) =>
  model.family?.startsWith('claude') ? 1 : 0.5
```

### Spreadable Presets

```typescript
const codingDefaults = {
  filter: { reasoning: true, toolCall: true, structuredOutput: true },
  constraints: [perProvider(1)],
  limit: 5,
}

pick.recommend(Purpose.Coding, codingDefaults)
pick.recommend(Purpose.Coding, { ...codingDefaults, limit: 10 })
```

### Model Return Type

Both `find()` and `recommend()` return models with IDs ready for both direct API and OpenRouter usage:

```typescript
result.id            // "claude-sonnet-4-5" (direct API / AI SDK model ID)
result.provider      // "anthropic" (provider key)
result.sdk           // "@ai-sdk/anthropic" (AI SDK provider package)
result.openRouterId  // "anthropic/claude-sonnet-4.5" (OpenRouter API slug)
result.score         // 0.87 (only on recommend results)
```

**`id`** is the models.dev ID, which matches the direct provider API and AI SDK model ID format. This is the canonical identifier.

**`openRouterId`** is derived at catalog parse time as `{provider}/{id}`, with one provider-specific transformation: Anthropic model IDs use hyphens for version numbers in the direct format (`claude-sonnet-4-5`) but dots in the OpenRouter format (`claude-sonnet-4.5`). The library handles this conversion automatically.

This means users can call models through either path without manual ID translation:

```typescript
// Direct API / AI SDK
import { anthropic } from "@ai-sdk/anthropic"
const model = anthropic(result.id)  // anthropic("claude-sonnet-4-5")

// OpenRouter
import { openrouter } from "@openrouter/ai-sdk-provider"
const model = openrouter(result.openRouterId)  // openrouter("anthropic/claude-sonnet-4.5")
```

### Power-User Primitives

The scoring engine is available as standalone exports for users who want full control:

```typescript
import { scoreModels, selectModels, costEfficiency, contextCapacity } from "pickai"

// Score any array of models with custom criteria
const scored = scoreModels(myModels, [
  { criterion: costEfficiency, weight: 3 },
  { criterion: contextCapacity, weight: 1 },
])

// Select from scored models with constraints
const selected = selectModels(scored, {
  constraints: [perProvider(1)],
  limit: 5,
})
```

These are the same functions the picker uses internally. Exported for users who have their own model data or want to bypass the picker abstraction.

---

## Example: Adding LMArena Benchmark Data

LMArena (Chatbot Arena) provides per-category Elo scores for 243 models. Categories include `coding`, `creative_writing`, `math`, `if` (instruction following), `hard_6` (complex prompts), `multiturn`, and more. Data is available as JSON from a community project updated daily.

The data is not built into pickai. Here's how to use it:

```typescript
import { createPicker, modelsDev, matchesModel, costEfficiency, contextCapacity } from "pickai"
import type { ScoringCriterion, PurposeProfile } from "pickai"

const pick = await createPicker(modelsDev())

// 1. Fetch the data yourself (from wherever you want)
const lmarenaData = await fetch(
  "https://raw.githubusercontent.com/nakasyou/lmarena-history/main/output/scores.json"
).then(r => r.json())

// 2. Extract the latest scores for the category you care about
const latest = lmarenaData[Object.keys(lmarenaData).sort().pop()!]
const codingScores = latest.text.coding   // { "claude-3-5-sonnet-20241022": 1315.2, ... }
const creativeScores = latest.text.creative_writing

// 3. Write a criterion that uses the data
// matchesModel() normalizes IDs (strips dates, dots→hyphens, lowercases) before comparing
function lmarenaCriterion(
  scores: Record<string, number>,
): ScoringCriterion {
  return (model, allModels) => {
    // Find the matching LMArena entry using pickai's built-in ID matcher
    const entry = Object.entries(scores).find(([id]) => matchesModel(model.id, id))
    if (!entry) return 0

    const score = entry[1]
    const allScores = Object.values(scores)
    const min = Math.min(...allScores)
    const max = Math.max(...allScores)
    if (max === min) return 0
    return (score - min) / (max - min)
  }
}

// 4. Create criteria — matchesModel handles the ID normalization internally
const codingElo = lmarenaCriterion(codingScores)
const creativeElo = lmarenaCriterion(creativeScores)

// 5. Use in a custom profile — no manual ID matching needed
const BenchmarkedCoding: PurposeProfile = {
  filter: { toolCall: true, structuredOutput: true },
  criteria: [
    { criterion: codingElo, weight: 5 },
    { criterion: contextCapacity, weight: 3 },
    { criterion: costEfficiency, weight: 2 },
  ],
}

pick.recommend(BenchmarkedCoding, { limit: 5 })
```

**What LMArena provides:**

| Category | What it measures |
|----------|-----------------|
| `overall` | Aggregate quality across all categories |
| `coding` | Code understanding, generation, debugging |
| `creative_writing` | Original, imaginative content |
| `math` | Mathematical reasoning and computation |
| `if` | Instruction following (58 diverse constraints) |
| `hard_6` | Complex, rigorous prompts |
| `multiturn` | Multi-turn conversation quality |
| `long_user` | Long input (>500 tokens) handling |

**Data access:** No official API. Available via [nakasyou/lmarena-history](https://github.com/nakasyou/lmarena-history) (MIT license), which converts HuggingFace data to JSON daily. 243 models. ~10MB+ file.

**ID format:** `claude-3-5-sonnet-20241022`, `gpt-4o-2024-08-06` — provider-specific with date suffixes. pickai's `matchesModel()` handles this normalization.

---

## Example: Adding Artificial Analysis Data

Artificial Analysis provides an Intelligence Index (composite quality score) and speed metrics. Unlike LMArena, it does NOT have per-category scores — coding and creative writing are not scored separately.

```typescript
import { createPicker, modelsDev, costEfficiency, contextCapacity } from "pickai"
import type { ScoringCriterion, PurposeProfile } from "pickai"

const pick = await createPicker(modelsDev())

// 1. Fetch AA data (endpoint may require checking their current API)
const aaData = await fetch("https://artificialanalysis.ai/api/models").then(r => r.json())

// 2. Build criteria from their metrics
const qualityIndex: ScoringCriterion = (model, allModels) => {
  const entry = aaData.find(m => m.id === model.id || m.name === model.name)
  if (!entry?.intelligence_index) return 0

  const allScores = aaData.map(m => m.intelligence_index).filter((v): v is number => Number.isFinite(v))
  const min = Math.min(...allScores)
  const max = Math.max(...allScores)
  if (max === min) return 0
  return (entry.intelligence_index - min) / (max - min)
}

const outputSpeed: ScoringCriterion = (model, allModels) => {
  const entry = aaData.find(m => m.id === model.id || m.name === model.name)
  if (!entry?.output_speed) return 0

  const allSpeeds = aaData.map(m => m.output_speed).filter((v): v is number => Number.isFinite(v))
  const min = Math.min(...allSpeeds)
  const max = Math.max(...allSpeeds)
  if (max === min) return 0
  return (entry.output_speed - min) / (max - min)
}

// 3. Build a profile
const FastAndSmart: PurposeProfile = {
  criteria: [
    { criterion: qualityIndex, weight: 4 },
    { criterion: outputSpeed, weight: 3 },
    { criterion: costEfficiency, weight: 2 },
    { criterion: contextCapacity, weight: 1 },
  ],
}

pick.recommend(FastAndSmart, { limit: 5 })
```

**What Artificial Analysis provides:**

| Metric | What it measures |
|--------|-----------------|
| Intelligence Index | Composite quality score (10 benchmarks aggregated) |
| Output speed | Tokens/sec during generation |
| TTFT | Time to first token (seconds) |
| End-to-end response time | Total response time |
| Blended price | Cost per 1M tokens (3:1 input:output ratio) |

**Key difference from LMArena:** One quality score, not per-category. You can't differentiate coding from creative writing. But you get speed/latency metrics that LMArena doesn't have.

**Data access:** `https://artificialanalysis.ai/api/models` — returned 404 during testing (March 2026). May require checking their current API docs or using their website data.

---

## Decisions and Rationale

### Why benchmarks are BYOD, not built-in

Every attempt to make benchmarks a built-in feature introduced fragile dependencies on third-party services with no official APIs. The library's core value — filtering and scoring models from a constantly changing landscape — works entirely on models.dev metadata. Benchmarks answer a different question ("which is actually best at X?") that is better served by the user's own data and evaluation pipeline.

The `ScoringCriterion` interface already handles benchmark data naturally. A criterion is just a function that returns 0-1. It can close over any external data. No special types, no dimension contracts, no source function infrastructure needed.

### Why weights are ratios, not fractions

Industry convention (Fuse.js, Elasticsearch, scikit-learn): accept arbitrary positive numbers, auto-normalize internally. Users think "cost is 3x more important than context" — not "cost is 0.75 and context is 0.25." The engine divides each weight by the sum of all weights. Users can't get the math wrong.

### Why all built-in profiles are metadata-only

If built-in profiles required benchmark data, the library's out-of-box experience would be "import, configure, fetch external data, then use." With metadata-only profiles, it's "import, use." Users who want benchmark-informed ranking build custom profiles — the examples above show exactly how.

### Why recency and knowledge freshness are quality proxies

Without benchmarks, newer models from the same provider are generally better — each generation improves on the last. Knowledge freshness (training data cutoff) correlates with a model knowing about recent APIs, frameworks, and world events. These are imperfect proxies, which is why the profiles are explicitly documented as metadata-based and the benchmark examples exist for users who need real quality data.

### Why `find()` defaults to recency sort

Users browsing available models generally want the most relevant options first. Newer models from the same provider are typically better than older ones, so recency is the most universally useful default. An optional `sort` parameter accepts built-in sort keys (`"costAsc"`) or a custom comparator `(a, b) => number` for full control.

### Why both `id` and `openRouterId` are first-class fields

Users call LLMs through two distinct patterns: direct provider APIs (Anthropic SDK, OpenAI SDK, AI SDK) and OpenRouter. These require different ID formats. For most providers, the OpenRouter ID is simply `{provider}/{id}`, but Anthropic is an exception — version number hyphens become dots (e.g., `claude-sonnet-4-5` → `anthropic/claude-sonnet-4.5`). Rather than forcing users to know these rules and transform IDs themselves, the model object provides both formats. The `openRouterId` is derived at catalog parse time using the same transformation logic already proven in v1's `parseOpenRouterModel`.

### Why source functions accept pre-fetched data

`modelsDev(myData)` skips the fetch and uses provided data. This handles: offline usage, testing with fixtures, custom/private model catalogs, caching at the application level. The same pattern would apply to any future source functions. No built-in caching — the construction pattern (`createPicker` at startup, reuse the instance) means fetching happens once, not per-request.

## Open Questions (Iteration 8)

1. **Naming** — `createPicker`, `find`, `recommend` — fine for now.
