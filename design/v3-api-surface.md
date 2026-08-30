# pickai v3: proposed API surface

**Status: draft for grilling. Nothing here is decided.**

This is the thing to attack. Every entry states what it is, why, and how confident it is. Items
marked **OPEN** are genuine questions, not rhetorical ones.

Governed by `v3-north-star.md`. Evidence in `design/research/`. History in
`continue-v3-redesign.md`.

---

## The shape of the change

v2 is a filter engine plus a weighted-sum scorer over catalog metadata. The research says the filter
half is right and the scoring half is measuring the wrong things.

v3 keeps the engine and changes what feeds it:

| Layer | v2 | v3 proposal |
| --- | --- | --- |
| Eligibility | 15 metadata filters | Same, plus policy gates, minus two fields that read contradictory data |
| Quality | 5 catalog-derived criteria | An attributed benchmark axis from outside the catalog |
| Cost | `costEfficiency`, min-maxed `cost.input` | Absolute projected spend at the user's workload |
| Ordering | Weighted sum, relative to candidate set | User-chosen axis, absolute units |
| Output | `ScoredModel[]`, rank-1 by default | Ordered shortlist with per-criterion breakdown |

---

## Survives unchanged

`fromModelsDev`, `parseModelsDevData`, `applyFilter`, `find`, `perProvider`, `perFamily`,
`perModel`, `normalizeOpenWeights`, `sortByCost`, `sortByRecency`, `sortByContext`, `sortByOutput`,
`DIRECT_PROVIDERS`, `OPENROUTER_PROVIDERS`, `ALL_KNOWN_PROVIDERS`, and the `Model` /
`ModelCost` / `ModelLimit` / `ModelModalities` / `Constraint` types.

The filter and constraint systems were the part the research validated. Leave them alone.

---

## New

### Benchmark adapters

```ts
type BenchmarkScore = {
  modelId: string;        // as the source names it
  value: number;
  metric: string;         // "arena_elo", "intelligence_index", ...
};

type BenchmarkSet = {
  source: string;         // "LMArena", "Artificial Analysis via OpenRouter", user-supplied
  measuredAt: string;     // ISO date
  license?: string;
  scores: BenchmarkScore[];
};

fromArena(opts?): Promise<BenchmarkSet>        // built-in default, CC BY 4.0, style-controlled
fromOpenRouter(opts?): Promise<BenchmarkSet>   // OPT-IN, must document the terms question
fromBenchmarkJSON(data: unknown): BenchmarkSet // BYOD, validates against the published schema
```

Every adapter returns the same shape, so nothing downstream knows where scores came from
(North Star rule 7, 8). `source` and `measuredAt` are required, not optional, because rule 2 says a
number without provenance is not usable.

**OPEN:** should `fromArena` fetch, or should the package ship a snapshot? Fetching keeps it fresh
and keeps the package zero-dependency and small. Shipping a snapshot makes it work offline and
deterministic, but means vendoring someone's data, which rule 7 says not to do. Leaning fetch.

### The join, with its failures visible

```ts
type JoinResult<T extends Model> = {
  joined: (T & { benchmark: number })[];
  unmatched: BenchmarkScore[];   // in the benchmark set, no catalog model
  unscored: T[];                 // in the catalog, no benchmark score
};

joinBenchmarks<T extends Model>(models: T[], set: BenchmarkSet): JoinResult<T>
```

Best measured join rate is 41%. A function that silently drops 59% is the bug we already found in
`examples/lmarena-benchmarks.ts`. Returning the misses makes them impossible to ignore and gives the
web app its repair screen.

**OPEN:** arena data rates *configurations* (`gpt-5.1` vs `gpt-5.1-high`) while models.dev catalogs
*endpoints*. Folding effort suffixes lifts coverage from 35/112 to 46/112 but leaves 9 models
holding rival ratings up to 19 Elo apart. Options: pick the highest, pick the base config, expose
all and refuse to choose. Leaning expose-all with the spread visible.

### Cost against a real workload

```ts
type Workload = {
  inputTokensPerCall: number;
  outputTokensPerCall: number;
  callsPerDay: number;
  cacheHitRate?: number;
};

projectCost(model: Model, workload: Workload): CostProjection | undefined
```

Returns absolute dollars, not a 0-1 score. Returns `undefined` when pricing is unknown, never 0
(rule 1). Reads `cacheRead` / `cacheWrite`, which `src/source.ts:75-76` already parses and nothing
currently reads.

**OPEN:** does this replace `costEfficiency` entirely, or sit beside it? A projection is a number
in dollars, not a criterion in 0-1. If ordering is by absolute cost, `costEfficiency` may have no
remaining job.

### Policy gates on `ModelFilter`

`dataResidency`, `zeroRetention`, `licenseHeld`. These are static facts, and they are the gates
regulated buyers apply first. models.dev does not carry them, so they need a source.

**OPEN and important:** this is the same "we do not have the data" problem that killed lifecycle
(parked, see the continue doc). If policy data needs a new feed, does it get parked too? If so, the
North Star's rule 3 has gates it cannot enforce, and the pitch's opening paragraph is fiction.

### Per-criterion breakdown on results

`ScoredModel` currently carries `score` and `coverage` and nothing else. The UI cannot say "won on
cost, lost on capability" without recomputing. Proposal: carry the per-criterion contributions.

---

## Changes shape

### `matchesModel` and friends

Nine of ten functions in `src/id.ts` are internal; only `matchesModel` is exported. BYOD users get
one boolean and cannot do their own join, which contradicts rule 8. Proposal: export
`normalizeModelId`, `parseModelId`, `resolveProvider`.

Two fixes needed regardless:
- Strip `:thinking` / `:free` variants. `parseModelId` can already do it; `matchesModel` never calls it.
- Convert spaces, so display names like "Claude Sonnet 4.5" can match.

### `deriveOpenRouterId` is currently wrong

0/34 Mistral and 0/12 xAI (`mistralai/`, `x-ai/`), and malformed output for 3/13 Anthropic entries
(`anthropic/claude-sonnet-4-5.20250929`). It joins at 48.2% against OpenRouter's real slugs, worse
than generic `matchesModel` at 58.0%. `openRouterId` is a public field on every `Model` and is wrong
today. ~30 lines.

### `minMaxCriterion` becomes opt-in only

It stays exported as a helper. It stops being the behavior of the built-in criteria. Reasons in the
North Star rule 1 and rule 4: relative scores change when the candidate set changes, which makes any
explanation unstable and makes unknowns look good.

### Contradictory filter fields

`attachment` disagrees with `modalities.input` on 289 catalog entries. Two filters over data that
disagree can return contradictory sets for the same intent. Derive one from the other, or drop
`attachment`.

`minOutput` filters a model-level number that is not true of the thing you buy: `gpt-oss-120b` ships
`max_completion_tokens` from 8,192 to 117,964 depending on endpoint. Label it honestly or drop it.

**OPEN:** `maxCostInput` / `maxCostOutput` are $/M ceilings. The research says nobody can reason
about those without a token volume, and `cost: {}` models silently bypass them entirely. Replace
with a `Workload`-based budget, or keep both?

---

## Proposed for deletion

**`contextCapacity`, `outputCapacity`, `recency` as scoring criteria.** Keep context and output as
threshold filters. Reasons: advertised context is distrusted by the products that publish it, and at
32K tokens 11 of 13 models claiming 128K+ drop below half their short-context baseline, so ranking
by advertised context rewards the loosest claim. Nothing in any sweep supports ranking by release
date.

**`knowledgeFreshness`** survives as a low-weight tiebreaker only.

---

## `BenchmarkScore` carries named metrics, not one value

```ts
type BenchmarkScore = {
  modelId: string;
  metrics: Record<string, number>;   // not a single `value`
};
```

Sources publish different things: an overall rating, per-category leaderboards, separate coding and
agentic indices. A single `value` field forces a choice at parse time and cannot absorb a new metric
later without a breaking change. Costs nothing now.

---

## The open question that shapes everything else

### Does `Purpose` survive?

**Deliberately unresolved. This is grilling material.**

If the three criteria above are dropped, four of the six profiles collapse into the same two
criteria differing only by a filter. `Quality` is currently `recency(5) + knowledgeFreshness(3) +
contextCapacity(2) + outputCapacity(2) + costEfficiency(1)`, which is a newness-and-spec-breadth
profile wearing the word Quality.

Three readings, all defensible:

1. **Rebuild the profiles** around the benchmark axis and projected cost. Keeps the familiar API,
   keeps a one-line entry point for people who do not want to think about criteria.
2. **Delete `Purpose`, `scoreModels`, and the built-in criteria.** The pitch already says the user
   picks the sort. Once eligibility cuts thousands to dozens, cost-per-task is one arithmetic
   expression and an expression needs no criteria, weights, or profiles. **Under this reading v3 is
   smaller than v2.**
3. **Keep the weighted-criteria engine, ship no default profiles.** Artificial Analysis runs exactly
   this machine commercially, as an explicitly weighted, reweightable, versioned composite. The
   machine may be right and only its fuel wrong.

North Star rule 4 ("the user picks the axis, we do not pick for them") leans away from 1. It does
not by itself decide between 2 and 3.

### Is the unit of selection a model or a model-and-endpoint?

Quality, latency, output limit and context all vary by endpoint, severely enough to have invalidated
a published paper. Recommendation on the table: **stay at model level and say so out loud**, because
endpoint selection is routing and rule 9 says pickai is not a router. But that makes `minOutput`,
`minContext`, and `providers`/`excludeProviders` less true than they read today.
