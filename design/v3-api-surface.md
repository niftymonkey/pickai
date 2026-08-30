# pickai v3: API surface

**Status: settled.** Grilled with Mark on 2026-08-30, one decision at a time, all confirmed.
This file is the shape. The why behind each item lives in `v3-decisions.md` 9.20 to 9.33.

Governed by `v3-north-star.md`. Evidence in `design/research/`. History in
`continue-v3-redesign.md`.

---

## The shape of the change

v2 is a filter engine plus a weighted-sum scorer over catalog metadata. The filter half was right.
The scoring half measured the wrong things, and rather than refuel it, v3 removes it and states a
rule: **catalog facts are filters and sort axes, never scores. Scores come only from measured,
attributed benchmark data.**

| Layer | v2 | v3 |
| --- | --- | --- |
| Eligibility | 15 metadata filters | Same minus `attachment`, and every fired gate names itself |
| Quality | 5 catalog-derived criteria | Attributed benchmark metrics from outside the catalog |
| Cost | `costEfficiency`, min-maxed `cost.input` | Published rates side by side, compared as multiples of the cheapest |
| Ordering | Weighted sum, relative to candidate set | User-chosen axis; benchmark score is the default sort |
| Output | `ScoredModel[]`, rank-1 by default | Ordered shortlist with explanations and an unrated bucket |

The unit of selection is the **model**, not the model-and-endpoint, and the docs and UI say so
plainly: quality, latency, and limits vary by endpoint, endpoint choice is routing, and North Star
rule 9 says pickai is not a router (9.24).

---

## Survives unchanged

`fromModelsDev`, `parseModelsDevData`, `applyFilter`, `find`, `perProvider`, `perFamily`,
`perModel`, `normalizeOpenWeights`, `sortByCost`, `sortByRecency`, `sortByContext`, `sortByOutput`,
`DIRECT_PROVIDERS`, `OPENROUTER_PROVIDERS`, `ALL_KNOWN_PROVIDERS`, and the `Model` /
`ModelCost` / `ModelLimit` / `ModelModalities` / `Constraint` types.

`scoreModels`, `criterionCoverage`, and the coverage machinery also survive: they are the engine
for blending benchmark metrics and BYOD data (9.21). `minMaxCriterion` stays exported as an opt-in
helper and stops being the behavior of anything built in.

---

## Deleted

- **`Purpose` and all six profiles.** No built-in profiles ship in v3. A named blend of weights is
  the library picking the axis behind a virtue word, which rule 4 forbids. Situation-named presets
  that fill in visible, editable values are UI work, recorded as the future home (9.20).
- **All five built-in criteria:** `costEfficiency`, `contextCapacity`, `outputCapacity`, `recency`,
  `knowledgeFreshness`. Each squashes a real fact into 0-1 through either min-max (unstable,
  rule 1) or an invented scale. Every deleted criterion's fact remains filterable, sortable, and
  visible (9.21). This goes one further than the draft, which kept `knowledgeFreshness` as a
  tiebreaker; it died with the rest because its 0-1 scale would also be invented.
- **The `attachment` filter.** It disagrees with `modalities.input` on 289 entries. The `modality`
  filter is the one way to ask the question. The raw boolean stays on `Model` as catalog data
  (9.30).
- **`projectCost` and `Workload`**, proposed in the draft, never ship. A projection multiplies the
  user's guess of their token shape, and models spend tokens differently (thinking tokens), so the
  number reads truer than it is (9.22).

---

## New

### Benchmark adapters

```ts
type MetricValue = {
  value: number;
  low?: number;    // confidence interval, when the source publishes one
  high?: number;
};

type BenchmarkScore = {
  modelId: string;                        // as the source names it, one row per rated thing
  metrics: Record<string, MetricValue>;   // "overall", "coding", "agent", ...
};

type BenchmarkSet = {
  source: string;         // "LMArena", user-supplied, ...
  measuredAt: string;     // ISO date
  license?: string;
  scores: BenchmarkScore[];
};

fromArena(opts?): Promise<BenchmarkSet>        // built-in default, CC BY 4.0, style-controlled
fromOpenRouter(opts?): Promise<BenchmarkSet>   // opt-in, off by default, states the terms question
fromBenchmarkJSON(data: unknown): BenchmarkSet // BYOD, validates against the published schema
```

Every adapter returns the same shape, so nothing downstream knows where scores came from. `source`
and `measuredAt` are required: a number without provenance is not usable (rule 2).

Named metrics with structured values, not a single number: sources publish several things at once,
new metrics land as new keys without a breaking change, and confidence intervals are first-class
so the UI can obey 9.14 (9.28).

`fromArena` **fetches live** (one GET to `datasets-server.huggingface.co/rows`, plain JSON, no
key, zero dependencies). No snapshot ships in the package: freshness is why this source won, and a
snapshot bakes in the expiry. Offline and pinned runs save the JSON once and replay it through
`fromBenchmarkJSON` (9.26).

### The join, with its failures visible

```ts
type JoinResult<T extends Model> = {
  joined: (T & { benchmarks: BenchmarkScore[] })[];  // plural: rival configs are all carried
  unmatched: BenchmarkScore[];   // in the benchmark set, no catalog model
  unscored: T[];                 // in the catalog, no benchmark score
};

joinBenchmarks<T extends Model>(models: T[], set: BenchmarkSet): JoinResult<T>
```

Best measured join rate is 41%. Returning the misses makes them impossible to ignore and gives the
web app its repair screen (9.13).

**Rival configuration ratings are all exposed, never averaged** (9.27). The arena rates
configurations (`gpt-5.1` vs `gpt-5.1-high`); after effort-suffix folding, 9 models hold rival
ratings up to 19 Elo apart. The joined model carries every rating with its configuration name. The
UI renders the spread as a band. When a single sort key is needed, it is the best-rated
configuration's real score, labeled with which configuration it came from. Nothing shown was not
measured.

### ID utilities go public

`normalizeModelId`, `parseModelId`, and `resolveProvider` are exported alongside `matchesModel`.
That is the toolkit a BYOD user needs to build the same join the built-in adapter uses (9.29,
satisfying 9.7). The other six functions in `src/id.ts` stay internal, deliberately.

### Explanations are the library's job

Both halves (9.31):

- Filtering can return, alongside survivors, the removed models each tagged with the rule that cut
  them. This is what lets every consumer, including the exported code, say "removed: $100/M input
  is above your $50 ceiling."
- Scored results carry per-metric contributions and the labeled sort key from the join.

The exported code must reproduce the app's answer (9.3), and the answer includes the explanation.
Exact carrier shape (second return field vs options flag) is an implementation detail.

### `sortByKnowledgeCutoff`

Knowledge cutoff stays a pickable axis as a comparator, now that `knowledgeFreshness` is gone.

---

## Changed

### `recommend` becomes the orchestrator over explicit inputs

No `Purpose` argument. It takes the models, a filter, an optional `BenchmarkSet`, an ordering (a
comparator, or weights over named benchmark metrics), and constraints. It runs filter, join,
order, and returns the ordered shortlist with explanations, coverage, and the unrated bucket
(9.32). Everything it does can be done by hand with `find` + `joinBenchmarks` + a sort;
`recommend` is the paved road, and the code export reads as one call with named arguments.

### Results are a table of facts

Score (benchmark) is the default sort. Every other column (input rate, output rate, context, max
output, release date, knowledge cutoff, provider, open weights) is a re-sort away (9.33). Models
with no benchmark score sit in an unrated bucket, never at the bottom of the ranking (rule 1).

### Cost renders as two rates plus multiples

Show $/M input and $/M output as published, each with source and date. Beside each, a multiple:
"input 2x, output 5x the cheapest on your list." Division on numbers already on screen. Unknown
price renders as "price unknown" and joins no comparison. No 0-1 cost score exists anywhere, so
the min-max cost bugs cannot come back (9.22). Input and output rates can disagree about which
model is cheaper; both are shown and the disagreement goes in the "not covered" list (rule 10).

### `maxCostInput` / `maxCostOutput` stay, as an outlier fence

Sharpened semantics, written into the docs: these cut only models whose **known** price is above
the ceiling. Unknown price is never cut by this rule. When the fence fires, it names itself. The
real use case is excluding the occasional absurdly priced catalog entry from script runs, not
budget reasoning (9.23).

### `minOutput` stays, honestly labeled

Model-level number; endpoints may undercut it (`gpt-oss-120b` ranges 8,192 to 117,964 by
endpoint). The label says so (9.24).

### `matchesModel` fixes

Strip `:thinking` / `:free` variants (via `parseModelId`, which already can). Convert spaces so
display names like "Claude Sonnet 4.5" match. Bug-list work, ships regardless (9.9).

### `deriveOpenRouterId` fix

`mistralai/`, `x-ai/`, and the date-suffix collision. Settled bug work (9.12), and the
`fromOpenRouter` adapter depends on it (9.14).

---

## Parked

`dataResidency` and `zeroRetention` gates are parked like lifecycle was (9.16): models.dev does
not carry them and sourcing them means a new feed plus upkeep. Reopen trigger in 9.25. The "no new
vendors" rule needs no data at all: it is the user's own fact, expressed today by `providers` /
`excludeProviders`. The pitch was rewritten to match, and Mark approved the wording; the canonical
text lives in 9.15.

---

## Product notes that fall out of this surface

- **UI presets, not library profiles.** The web app may offer situation-named starting points (the
  six North Star situations are the natural list) that fill in visible, editable values. The pick
  stays on screen, the exported code carries final values, never a preset name (9.20).
- The BYOD upload screen shows `unmatched` and `unscored` and allows repair (9.13).
- Bands and tiers for ratings, never positions (9.14).
