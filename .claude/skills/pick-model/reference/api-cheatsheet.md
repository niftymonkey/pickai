# pickai API cheatsheet (for /pick-model)

Everything needed to generate a correct script. Verified against `src/` at
pickai v2.1.1. If a signature here disagrees with `src/`, `src/` wins: re-check.

## Exports (all from `"pickai"`)

```ts
// Data
fromModelsDev(prefetched?) => Promise<Model[]>   // fetch + parse models.dev/api.json
parseModelsDevData(data) => Model[]              // parse pre-fetched blob

// Choose
find(models, FindOptions) => Model[]             // filter + sort + limit, no scoring
recommend(models, PurposeProfile, RecommendOptions?) => ScoredModel<T>[]
scoreModels(models, WeightedCriterion[]) => ScoredModel<T>[]

// Scoring criteria (each: (model, allModels) => 0..1)
costEfficiency, contextCapacity, outputCapacity, recency, knowledgeFreshness
minMaxCriterion(getValue: (m) => number | undefined, invert = false)

// Built-in profiles
Purpose.Cheap | .Balanced | .Quality | .Coding | .Creative | .Reasoning

// Selection constraints
perProvider(max = 1), perFamily(max = 1)

// Sort comparators (for find)
sortByCost(dir?), sortByRecency(dir?), sortByContext(dir?), sortByOutput(dir?)
// dir = "asc" | "desc"

// Providers (readonly arrays of models.dev slugs)
DIRECT_PROVIDERS      // anthropic, openai, google, mistral, xai, deepseek, cohere
OPENROUTER_PROVIDERS  // DIRECT + llama, nvidia, qwen, perplexity, groq, togetherai
ALL_KNOWN_PROVIDERS

// IDs
matchesModel(a, b) => boolean   // fuzzy cross-format ID match

// Types
Model, ModelCost, ModelLimit, ModelModalities, ModelFilter, ScoredModel,
ScoringCriterion, WeightedCriterion, PurposeProfile, Constraint,
FindOptions, RecommendOptions
```

## Model shape

```ts
interface Model {
  id: string;              // models.dev id, matches direct-API / AI SDK format
  name: string;
  provider: string;        // "anthropic", "openai", ...
  openRouterId: string;    // "anthropic/claude-sonnet-4.5"
  description?: string;
  cost?: ModelCost;        // { input, output, cacheRead?, cacheWrite? } per 1M tokens USD; undefined = unknown
  limit: ModelLimit;       // { context, output }
  modalities: ModelModalities; // { input: string[], output: string[] }
  reasoning?, toolCall?, structuredOutput?, openWeights?, attachment?: boolean;
  family?: string;         // "claude", "gpt", "gemini"
  knowledge?: string;      // "2025-03"
  releaseDate?: string;    // "2025-09-29"
  lastUpdated?: string;
  status?: string;         // "active" | "deprecated" | "beta"
  sdk?: string;            // "@ai-sdk/anthropic"
}
```

## ModelFilter (all fields AND-combined; capability flags only filter when `true`)

```ts
interface ModelFilter {
  reasoning?, toolCall?, structuredOutput?, openWeights?, attachment?: boolean;
  maxCostInput?, maxCostOutput?: number;   // models with unknown cost PASS
  minContext?, minOutput?: number;
  providers?: string[];                    // include only these
  excludeProviders?: string[];
  inputModalities?: string[];              // model must support ALL listed
  outputModalities?: string[];
  excludeDeprecated?: boolean;             // default true
  minKnowledge?: string;                   // "2025-01"; models without knowledge fail this
}
```

Notes: `find` and `recommend` both accept `filter` as this object OR a
`(model) => boolean` predicate. `recommend`'s options filter is AND-combined
with the profile's own filter.

## Built-in Purpose profiles (weights)

- `Cheap`: costEfficiency 7, recency 1
- `Balanced`: costEfficiency 1, recency 1, contextCapacity 1, outputCapacity 1, knowledgeFreshness 1
- `Quality`: recency 5, knowledgeFreshness 3, contextCapacity 2, outputCapacity 2, costEfficiency 1
- `Coding`: filter `{ toolCall: true }`; recency 4, knowledgeFreshness 3, contextCapacity 3, outputCapacity 2, costEfficiency 1
- `Creative`: contextCapacity 4, recency 3, knowledgeFreshness 2, outputCapacity 1, costEfficiency 1
- `Reasoning`: filter `{ reasoning: true }`; recency 5, knowledgeFreshness 3, outputCapacity 2, contextCapacity 2, costEfficiency 1

A custom profile is just `{ filter?, criteria: [{ criterion, weight }, ...] }`.
Weights are relative; they get normalized to sum to 1.

## Scoring semantics (important)

- All built-in criteria are **min-max normalized across the candidate set**.
  Scores are relative to who else is in the pool. Do not score a subset and
  compare against a different subset's scores.
- `costEfficiency`: cheaper input cost scores higher; **unknown pricing scores 0**
  (no credit for missing cost).
- `minMaxCriterion(getValue, invert?)`: returns 0 when `getValue` is undefined;
  otherwise min-max over all defined values. `invert: true` makes lower = better.
- `recommend` returns results sorted by score desc, each with `.score` (0..1).

## Benchmark sources (BYOD, enter as `minMaxCriterion`)

### LMArena (free, no key, human preference)

```ts
const res = await fetch(
  "https://raw.githubusercontent.com/nakasyou/lmarena-history/main/output/scores.json",
);
if (!res.ok) throw new Error(`LMArena fetch failed: ${res.status}`);
const scoresData = await res.json();
const dates = Object.keys(scoresData).sort();
const latest = scoresData[dates[dates.length - 1]].text.overall; // { modelId: score }
// category scores also exist under .text.<category> and other modalities
```

### Artificial Analysis (objective intelligence index, needs key)

```ts
const key = process.env.ARTIFICIAL_ANALYSIS_API_KEY;
if (!key) { console.error("Set ARTIFICIAL_ANALYSIS_API_KEY"); process.exit(1); }
const res = await fetch("https://artificialanalysis.ai/api/v2/data/llms/models",
  { headers: { "x-api-key": key } });
if (!res.ok) throw new Error(`AA fetch failed: ${res.status}`);
const aa = await res.json();
// aa.data[] has { slug, evaluations: { artificial_analysis_intelligence_index, ... } }
```

Match benchmark rows to catalog models with `matchesModel(benchRow.id, model.id)`.
Unmatched models get `undefined` -> score 0 for that criterion, which does not
distort the normalization range.

## Template A: catalog-only recommend

```ts
/**
 * Model picks for <project>.
 * Pool: <providers/capabilities/limits/cost>. Purpose: <profile or weights>.
 * Answer: top <n>, <diversity>. Re-run to refresh against live models.dev.
 */
import {
  fromModelsDev, recommend, Purpose,
  perProvider, perFamily, DIRECT_PROVIDERS,
} from "pickai";

async function main() {
  const models = await fromModelsDev();
  const results = recommend(models, Purpose.Coding, {
    filter: { providers: [...DIRECT_PROVIDERS], toolCall: true, maxCostInput: 5 },
    constraints: [perProvider(1), perFamily(1)],
    limit: 5,
  });
  console.table(results.map((m) => ({
    Score: +m.score.toFixed(3),
    Model: m.name,
    Provider: m.provider,
    Cost: m.cost?.input != null ? `$${m.cost.input}/M` : "n/a",
    Context: m.limit.context,
  })));
}
main();
```

## Template B: benchmark-weighted recommend (LMArena)

```ts
/**
 * Model picks for <project>, ranked primarily by human preference (LMArena).
 * Re-run to refresh; LMArena updates daily, models.dev is live.
 */
import {
  fromModelsDev, recommend, minMaxCriterion, matchesModel,
  costEfficiency, recency, perProvider, perFamily, DIRECT_PROVIDERS,
  type Model,
} from "pickai";

async function main() {
  const models = await fromModelsDev();

  const res = await fetch(
    "https://raw.githubusercontent.com/nakasyou/lmarena-history/main/output/scores.json",
  );
  if (!res.ok) throw new Error(`LMArena fetch failed: ${res.status}`);
  const scoresData = await res.json();
  const dates = Object.keys(scoresData).sort();
  const latest = scoresData[dates[dates.length - 1]].text.overall;
  const benchmarks = Object.entries(latest).map(([modelId, score]) => ({
    modelId, score: score as number,
  }));

  type ArenaModel = Model & { arena?: number };
  const enriched: ArenaModel[] = models.map((m) => ({
    ...m,
    arena: benchmarks.find((b) => matchesModel(b.modelId, m.id))?.score,
  }));

  const humanPreference = minMaxCriterion((m: ArenaModel) => m.arena);
  const results = recommend(enriched, {
    criteria: [
      { criterion: humanPreference, weight: 5 },
      { criterion: costEfficiency, weight: 2 },
      { criterion: recency, weight: 1 },
    ],
  }, {
    filter: { providers: [...DIRECT_PROVIDERS] },
    constraints: [perProvider(2), perFamily(1)],
    limit: 10,
  });

  console.table(results.map((m) => ({
    Score: +m.score.toFixed(3),
    Model: m.name,
    Provider: m.provider,
    Arena: m.arena != null ? Math.round(m.arena) : "n/a",
    Cost: m.cost?.input != null ? `$${m.cost.input}/M` : "n/a",
  })));
}
main();
```

For Artificial Analysis or multi-source blends, follow
`examples/aa-benchmarks.ts` and `examples/multi-benchmark.ts` verbatim, just
wrapped in `main()`.
