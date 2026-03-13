# pickai 2.0 — API Design Iterations

A living document tracking how the v2 API shape evolved through research and discussion.

**Current iteration:** [Iteration 8](./iterations/iteration-8.md) — Metadata-first, benchmarks as BYOD. All built-in profiles work out of the box.

## Research Foundation

### models.dev Data Shape

**API:** `https://models.dev/api.json` — proper public endpoint, no auth, backed by SST.

**Structure:** Flat object keyed by provider ID (102 providers, 3,731 model entries). Each provider has metadata (`id`, `name`, `npm` package for AI SDK, `env` for API keys) and a `models` object. Same logical model can appear under multiple providers.

**Example entry (Claude Opus 4.6 under Anthropic):**
```json
{
  "id": "claude-opus-4-6",
  "name": "Claude Opus 4.6",
  "family": "claude-opus",
  "attachment": true,
  "reasoning": true,
  "tool_call": true,
  "temperature": true,
  "open_weights": false,
  "structured_output": true,
  "knowledge": "2025-05",
  "release_date": "2026-02-05",
  "last_updated": "2026-02-05",
  "modalities": { "input": ["text", "image", "pdf"], "output": ["text"] },
  "cost": {
    "input": 5, "output": 25,
    "cache_read": 0.5, "cache_write": 6.25,
    "context_over_200k": { "input": 10, "output": 37.5, "cache_read": 1, "cache_write": 12.5 }
  },
  "limit": { "context": 200000, "output": 128000 }
}
```

**Field coverage across 3,731 models:**

| Field | Coverage | Notes |
|-------|----------|-------|
| `id`, `name`, `release_date`, `last_updated`, `modalities`, `limit` | 100% | Always present |
| `attachment`, `reasoning`, `tool_call`, `open_weights` | 100% | Boolean capabilities |
| `cost` (input/output) | 94.6% | Missing = provider didn't publish pricing |
| `temperature` | 84.7% | Boolean; reasoning models often `false` |
| `family` | 75.1% | Groups model variants (e.g., "claude-opus") |
| `knowledge` | 50.7% | Training data cutoff date |
| `structured_output` | 39.9% | Boolean when present; absent != false |
| `status` | 0.6% | Only value: `"deprecated"` |

**Extended pricing:** `cache_read` (29%), `cache_write` (10%), `reasoning` (1.4%, xAI Grok), `context_over_200k` (1.8%, Anthropic/Google), `input_audio`/`output_audio` (<1%).

**ID format:** Provider-specific AI SDK model IDs. Not globally unique — global key is `{provider}/{model-id}`. Provider-level `npm` field points to AI SDK provider package (e.g., `@ai-sdk/anthropic`).

**Notable fields not in the original brief:**
- `family` — groups model variants; useful for deduplication and "best per family" logic
- `temperature` — boolean; reasoning models often have `false`
- `cost.reasoning` — separate per-token price for reasoning tokens
- `cost.context_over_200k` — tiered pricing for long-context usage
- `limit.input` — explicit input limit when it differs from `context - output`

### Benchmark Source Landscape

#### Artificial Analysis

**What it provides:**
- **Intelligence Index** — one composite quality score aggregating 10 benchmarks (GDPval-AA, Terminal-Bench, SciCode, LCR, AA-Omniscience, IFBench, HLE, GPQA Diamond, CritPt, tau-Bench). No per-category breakdown.
- **Speed metrics** — output tokens/sec, TTFT (time to first token), end-to-end response time. Live data sampled 8x/day over 72 hours.
- **Pricing** — blended price, input/output price (redundant with models.dev).

**Limitation:** No per-category scores. You cannot get a "coding score" vs a "creative writing score." `Purpose.Coding` and `Purpose.Creative` profiles would reference the same quality field. Less compelling for purpose-specific ranking.

**Good for:** Overall quality ranking + speed/latency as a scoring dimension.

#### LMArena (Chatbot Arena)

**Data access:** No official public API. Data accessible via community project [nakasyou/lmarena-history](https://github.com/nakasyou/lmarena-history) (MIT license). Converts HuggingFace pickle data to JSON daily via GitHub Actions. Raw JSON publicly accessible at `raw.githubusercontent.com`, no auth. File is large (~10MB+).

**Categories (243 models, excluding style-control variants):**

| Category | Description | pickai Dimension |
|----------|-------------|-----------------|
| `overall` | Aggregate across all categories | `quality` |
| `coding` | Code understanding, generation, debugging | `coding` |
| `creative_writing` | Original, imaginative content | `creative` |
| `math` | Mathematical reasoning and computation | `math` |
| `if` | Instruction following (58 diverse constraints) | `instruction` |
| `hard_6` | Complex, rigorous prompts | `reasoning` |
| `multiturn` | Multi-turn conversation quality | `multiturn` |
| `long_user` | Long input (>500 tokens) handling | (unmapped) |
| Language-specific | english, chinese, japanese, korean, french, german, spanish, russian | (unmapped) |

**Example — Claude 3.5 Sonnet across categories:**
```
overall:          1279.5    coding:           1315.2
creative_writing: 1265.1    math:             1293.0
if:               1287.3    hard_6:           1282.1
multiturn:        1281.8
```

**Model ID format:** Provider-specific with date suffixes (e.g., `claude-3-5-sonnet-20241022`). Needs mapping to models.dev IDs which don't have date suffixes.

**Good for:** Per-category quality ranking. This is what makes `Purpose.Coding` meaningfully different from `Purpose.Creative`.

#### Benchmark Source Strategy

1. **LMArena is the richest source** — per-category Elo with 243 models, daily updates, MIT-licensed.
2. **AA adds speed/latency** — something LMArena doesn't provide.
3. **Both have ID matching challenges** — neither uses models.dev IDs directly. Fuzzy matching or lookup tables needed.
4. **Sources must be pluggable** — users may bring their own benchmark data. Profiles reference pickai's standard `BenchmarkDimension` type, not source-specific field names. Source functions map their data to the standard dimensions.

### Library API Pattern Research

Six libraries analyzed for filter + rank/score patterns:

**Prisma (`findMany`)** — single options object with `where` + `orderBy` as siblings.
```typescript
await prisma.user.findMany({
  where: { email: { endsWith: 'prisma.io' } },
  orderBy: [{ name: 'asc' }],
  take: 10,
})
```

**TanStack Query** — spread/override pattern for composition.
```typescript
const query = useQuery({ ...groupOptions(1), select: (data) => data.groupName })
```

**Algolia** — filtering per-query, ranking pre-configured.
```typescript
client.search({ filters: 'price:100 TO 500 AND brand:Apple' })
client.setSettings({ customRanking: ['desc(popularity)', 'asc(price)'] })
```

**MiniSearch / Fuse.js** — constructor defaults + per-call overrides, predicate filter.
```typescript
search.search('query', { filter: (r) => r.category === 'fiction', boost: { title: 3 } })
```

**Drizzle** — builder chain with standalone operators. More complex typing for same result.

**AI SDK Provider Registry** — static registration, no discovery. Confirms pickai's value gap.

### Synthesis: Five Patterns

1. **Options object over builder chain.** Spreadable, fully typeable, no fluent API to learn.
2. **Filter and rank as sibling concerns.** Prisma's `where` + `orderBy`, Algolia's filter/rank separation.
3. **Constructor defaults + per-call overrides.** MiniSearch/Fuse pattern maps to `createPicker()` + methods.
4. **Predicate function as escape hatch.** `filter: (r) => boolean` handles what declarative filters can't.
5. **Spread/override for composition.** TanStack's `{ ...defaults, select: ... }` pattern.

### Resolved: Is Metadata-Only Recommendation Valuable?

**Yes.** With models.dev data, metadata-only covers two distinct jobs:

1. **Build-time candidate selection:** "I have 400+ models. Which ones should I even bother evaluating?" Filter by capabilities, cost, context, maturity, modalities. Narrows to a manageable shortlist.
2. **Runtime model discovery:** "Show the user what's available, filtered to what works in this app." Capabilities your app requires, sorted by cost or recency.

**What metadata cannot do:** Rank by actual performance. `reasoning: true` means the model supports reasoning, not that it's good at it. Quality ranking requires benchmark data.

**Implication:** The API has two operations for two jobs — not one operation with benchmarks as an optional upgrade.

---

## Iterations

| # | Name | Status | File |
|---|------|--------|------|
| 1–4 | Prior iterations | Superseded | [prior-1-through-4.md](./iterations/prior-1-through-4.md) |
| 5 | Clean slate — two methods, standard dimensions, full profile/criteria design | Superseded by 7 | [iteration-5.md](./iterations/iteration-5.md) |
| 6 | v1 evolution — same structure, v1 concepts preserved | Comparison only | [iteration-6.md](./iterations/iteration-6.md) |
| 7 | Standard dimensions with honest source boundaries | Superseded by 8 | [iteration-7.md](./iterations/iteration-7.md) |
| 8 | Metadata-first, benchmarks as BYOD | **Active** | [iteration-8.md](./iterations/iteration-8.md) |

---

## Decisions Made

These are locked in unless a future iteration reveals a reason to revisit. Each includes the iteration where it was decided — see the iteration file for full rationale.

- **Two operations for two jobs** (iter 5): `find()` for metadata-only discovery/filtering, `recommend()` for scored ranking.
- **models.dev as sole external dependency** (iter 5, refined iter 8): Proper public API, backed by SST. Rich structured metadata.
- **Benchmarks are BYOD** (iter 8): No built-in benchmark source functions or types. Users incorporate benchmark data via custom `ScoringCriterion` functions that close over their own data. Documented with LMArena and AA examples.
- **All built-in profiles are metadata-only** (iter 8): `Purpose.Cheap`, `Balanced`, `Quality`, `Coding`, `Creative`, `Reasoning` all work out of the box with no external data beyond models.dev.
- **Weights are ratios, auto-normalized** (iter 8): Arbitrary positive numbers, default `1`. Engine normalizes internally. Users think "5x more important" not fractions. Matches Fuse.js/Elasticsearch convention.
- **Source functions accept pre-fetched data** (iter 8): `modelsDev(myData)` skips fetch. Handles offline, testing, caching at app level.
- **No `preferredTier` on profiles** (iter 5): Tier was a proxy for quality. No longer needed.
- **Composable constraints replace boolean flags** (iter 5): `perProvider(n)`, `perFamily(n)`, custom constraints.
- **Scoring criteria inventory** (iter 5): Carry `costEfficiency`, `contextCapacity`, `recency`. Add `knowledgeFreshness`, `outputCapacity`. Drop `versionFreshness`, `tierFit`.
- **No silent degradation** (iter 4): Core principle throughout all iterations.
- **Filter accepts object or predicate** (iter 5): `ModelFilter | ((model: Model) => boolean)` — one key, two modes.
- **No built-in caching** (iter 8): Source functions are called once at startup. Caching is the user's concern.
- **Everything in one export** (iter 8): No subpath exports. Single `"pickai"` import.
- **Power-user primitives exported** (iter 8): `scoreModels()`, `selectModels()`, criteria functions available from `"pickai"`.
- **Both `id` and `openRouterId` are first-class fields** (iter 8): `id` = models.dev / direct API / AI SDK format. `openRouterId` derived at parse time as `{provider}/{id}` with Anthropic-specific version dot conversion. Users don't transform IDs manually.
- **`find()` sorts by recency by default** (iter 8): Most recent `release_date` first. Optional `sort` parameter accepts built-in keys or custom comparator.
- **`matchesModel()` exported as ID matching utility** (iter 8): Already exists in v1. Normalizes IDs (strips dates, dots→hyphens, lowercases) before comparing. Directly supports the BYOD benchmark pattern — users don't write their own fuzzy matchers.

## Open Questions

1. **Naming** — `createPicker`, `find`, `recommend` — fine for now.
