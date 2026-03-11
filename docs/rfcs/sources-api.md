# RFC: Sources API — Data Fetching Built Into pickai

## Status
Draft — exploring API shape. Not yet committed to implementation.

## Problem

pickai is a pure-function library. Users must write identical boilerplate every time:

1. Fetch the OpenRouter catalog themselves
2. Parse it with `parseOpenRouterCatalog()`
3. Optionally fetch Artificial Analysis benchmarks
4. Build `Map<string, number>` lookup tables manually
5. Write custom `ScoringCriterion` functions to wire benchmark data into scoring

Every consumer rewrites steps 1-5. The library provides the parsing and scoring, but the glue code is always the same.

## Inspiration: `models` CLI

[arimxyer/models](https://github.com/arimxyer/models) (`modelsdev` on crates.io) is a Rust TUI/CLI for browsing AI models, benchmarks, and coding agents.

**What it does:**
- Browse 3,000+ models across 85+ providers (data from [models.dev](https://models.dev))
- Compare model performance across 15+ benchmarks (data from [Artificial Analysis](https://artificialanalysis.ai))
- Track AI coding agent versions and changelogs
- Provider categorization: Origin, Cloud, Inference, Gateway, Dev Tool
- Structured capability indicators: Reasoning, Tools, Files, Open/Closed weights
- CLI mode with `--json` output for scripting

**What's relevant to pickai (things we don't already have):**

| Feature | Relevance | Notes |
|---------|-----------|-------|
| Provider type taxonomy | Medium | Origin/Cloud/Inference/Gateway/Dev Tool — useful for filtering and scoring |
| Reasoning capability flag | High | pickai has `supportsTools()` and `supportsVision()` but no `supportsReasoning()` or `isOpenWeights()` |
| models.dev as data source | Medium | Different catalog with 85+ providers; could be a second `ModelSource` |

**What's NOT relevant (pickai already handles or it's out of scope):**
- Benchmark data integration — pickai already has `withAaSlug()` + custom criteria workflow
- Cross-provider model matching — `matchesModel()`, `normalizeModelId()` already exist
- Agent tracking — different domain
- TUI/visualization — pickai is a library, not a UI

## What pickai Does Today

For full details, see the [docs/](../getting-started.md) directory. Summary:

**Adapters:** `parseOpenRouterCatalog()` converts raw OpenRouter JSON into `Model[]`. Pure function — user handles fetch.

**Enrichment:** `enrich()`, `withClassification()`, `withDisplayLabels()`, `withAaSlug()` — composable enrichers that add tier, cost tier, display labels, and Artificial Analysis slug mapping.

**Classification:** `classifyTier()` (Efficient/Standard/Flagship), `classifyCostTier()` (Free/Budget/Standard/Premium/Ultra), ordinal filters (`maxCost`, `minTier`), capability checks (`supportsTools`, `supportsVision`, `isTextFocused`).

**Scoring:** `scoreModels()` with weighted criteria (`costEfficiency`, `contextCapacity`, `recency`, `versionFreshness`, `tierFit`). Custom `ScoringCriterion` functions supported. `selectModels()` for constrained selection.

**Recommendation:** `recommend()` — high-level API combining scoring + tier filtering + selection. Built-in profiles (`Purpose.Cheap`, `Purpose.Balanced`, `Purpose.Quality`). Custom profiles with composable criteria.

**Benchmark integration (current, manual):** `withAaSlug()` derives AA slugs, user fetches AA data, builds score maps, writes custom criteria. See [docs/scoring.md](../scoring.md) "Scoring with External Benchmark Data" section.

## Proposed API: Sources

### Concept

Introduce **sources** — async functions that handle fetching and parsing data from external APIs. pickai ships default implementations. Users can write their own by conforming to the interface.

Two types of source:
- **ModelSource** — provides `Model[]` (replaces fetch + parse boilerplate)
- **BenchmarkSource** — provides structured benchmark scores (replaces fetch + map-building + criterion-writing boilerplate)

### Term Choice

"Source" was chosen over:
- "Adapter" — already used in pickai for parse-only functions (`parseOpenRouterCatalog`)
- "Provider" — overloaded in the AI model context (Anthropic, OpenAI, etc.)
- "Loader" — considered, but "source" better describes the origin of data

### API Shape

**One entry point. Benchmarks at the call site.**

```typescript
import { createPicker, openRouter, artificialAnalysis, Purpose } from "pickai"

// Setup — one source, one call
const pick = await createPicker(openRouter())

// Simple recommendation — no benchmarks needed
pick.recommend(Purpose.Balanced)

// Benchmark-informed — benchmarks provided where they're used
const benchmarks = await artificialAnalysis()

pick.recommend(Purpose.Coding, { benchmarks })
pick.recommend(Purpose.Creative, { benchmarks })
```

### Why This Shape

**Single `createPicker()`** — no `createBenchmarkPicker()` variant. One entry point, simple mental model.

**Benchmarks at the call site** — the `recommend()` call shows exactly what data is informing the result. No hidden state, no "did my picker have benchmarks or not?"

**Pre-resolved benchmark data** — `artificialAnalysis()` fetches once, returns data. Pass the resolved result to multiple `recommend()` calls. Keeps `recommend()` itself synchronous and pure (consistent with current pickai design).

**Profiles declare benchmark intent** — purpose profiles reference benchmark fields by name:

```typescript
// Built-in profile (conceptual)
const CodingProfile: PurposeProfile = {
  preferredTier: Tier.Standard,
  criteria: [
    { criterion: costEfficiency, weight: 0.2 },
    { criterion: contextCapacity, weight: 0.3 },
  ],
  benchmarks: [
    { field: "coding", weight: 0.5 },
  ],
  require: { tools: true },
}
```

The picker resolves `{ field: "coding" }` against the benchmark data passed to `recommend()`.

### Error Handling — No Silent Degradation

This was a key design constraint: **if a profile references benchmarks and none are provided, that must be an error, not a silent fallback.**

Rationale: if someone writes a profile weighted 50% on coding benchmarks and those benchmarks silently disappear, the recommendations are completely different but look correct. That's worse than a crash.

**Two failure modes, both loud:**

1. **Profile references benchmarks, none provided to `recommend()`** — throws with a clear message explaining which benchmark fields are missing
2. **Source fetch fails** — the `await artificialAnalysis()` or `await openRouter()` call rejects. Failure happens at data-loading time, before any recommendations

**No silent degradation path exists.**

### Existing API Unchanged

The pure-function API (`scoreModels()`, `recommend()`, `enrich()`, `parseOpenRouterCatalog()`, etc.) stays as-is. Sources are additive — a convenience layer on top. Users who want full control can still bring their own data.

## Key Question: Is the Benchmark-Free Path Valuable?

This needs honest evaluation. The current built-in profiles (`Purpose.Balanced`, `Purpose.Quality`, `Purpose.Cheap`) score models using only metadata from the OpenRouter catalog: cost, context window size, and recency (release date as a proxy for capability). No benchmarks, no external data.

This was the original design — and it worked well enough to build real apps on before benchmark integration even existed. But now that benchmark sources are on the table, and other potential criteria sources beyond benchmarks are becoming apparent, the question is:

**Does the "just OpenRouter metadata" recommendation path still provide meaningful value, or is it effectively a toy without benchmark data?**

Things to evaluate when returning to this:
- What decisions were actually being made in real apps using only cost/recency/context? Were those recommendations good enough?
- Is `recency` a defensible proxy for quality, or does it just happen to correlate right now and will break as the model landscape matures?
- If the answer is "not really valuable without benchmarks," does that change the API shape? Maybe `createPicker()` should *require* a benchmark source, and the no-benchmarks path is just `scoreModels()` directly.
- Are there other data sources beyond benchmarks that would further erode the value of metadata-only recommendations? (e.g., community ratings, real-world usage data, provider reliability/uptime)
- What's the minimum viable recommendation — what data do you actually need before `recommend()` is worth calling?

This is not about removing the pure-function API. `scoreModels()` with explicit criteria will always work. The question is specifically about `recommend()` with built-in profiles — are those profiles honest about what they can deliver with limited data?

## Data Source Comparison: OpenRouter vs models.dev

The `models` CLI consumes data from [models.dev](https://models.dev) (by SST), which has a public API at `https://models.dev/api.json`. This is worth evaluating as a potential `ModelSource` — and the comparison with OpenRouter is directly relevant to the question of whether metadata-only recommendations are valuable.

### Field comparison

| Field | OpenRouter | models.dev | Notes |
|-------|-----------|------------|-------|
| Pricing (input/output) | Yes | Yes | models.dev also has `reasoning`, `cache_read`, `cache_write`, audio pricing |
| Context window | Yes | Yes (context, input, output limits separately) | models.dev is more granular |
| Release date | Yes | Yes (`release_date` + `last_updated`) | |
| Modalities | Yes | Yes (input/output arrays) | |
| Tool calling | Via `supported_parameters` | `tool_call: boolean` | models.dev is explicit |
| **Reasoning** | **No** | **`reasoning: boolean`** | This is a gap in OpenRouter |
| **Open weights** | **No** | **`open_weights: boolean`** | This is a gap in OpenRouter |
| **Structured output** | **No** | **`structured_output: boolean`** | This is a gap in OpenRouter |
| **Attachments** | **No** | **`attachment: boolean`** | This is a gap in OpenRouter |
| **Model status** | **No** | **`alpha`/`beta`/`deprecated`** | Useful for filtering |
| Knowledge cutoff | No | `knowledge: "YYYY-MM"` | |
| Provider count | ~100+ | 85+ (community-maintained TOML files) | |
| AI SDK model IDs | No | Yes (used as primary key) | |

### Key takeaway

models.dev has structured boolean fields for capabilities that OpenRouter buries in `supported_parameters` or doesn't expose at all. If pickai had a models.dev source, several capabilities that currently don't exist (`supportsReasoning()`, `isOpenWeights()`, `supportsStructuredOutput()`) would become trivially available.

This feeds directly into the "is metadata-only recommendation valuable" question: with models.dev data, you'd have significantly richer metadata to score against — reasoning capability, open weights, structured output — without needing benchmarks at all. The answer to "are metadata-only recommendations useful" might depend heavily on *which* metadata source you're using.

### Decision direction: models.dev as the sole default source

Since models.dev provides everything OpenRouter does *plus* the structured capability fields that OpenRouter lacks, there's no clear reason to keep OpenRouter as the default (or even as a built-in source). The proposal is to **base pickai entirely on models.dev** as the default `ModelSource`.

**Why this matters for the library's value proposition:**
- Metadata-only recommendations become genuinely useful — you can score on reasoning, open weights, structured output, model maturity, knowledge cutoff, and granular pricing without any benchmark data
- Benchmarks become a *power-user enhancement* on top of an already solid foundation, not a requirement for meaningful results
- The narrative for users becomes: "pickai gives you smart recommendations out of the box. Add benchmark data and they get even better."

**Documentation impact:** When this switch happens, the README, getting-started guide, and any docs that reference OpenRouter as the data source need to be updated. The docs should clearly explain *why* models.dev was chosen — the richer structured metadata (reasoning, open weights, structured output, model status, knowledge cutoff) is what makes metadata-only recommendations actually meaningful. Users should understand that the default source was deliberately chosen because it provides enough signal for real recommendations without requiring external benchmark data. The existing `parseOpenRouterCatalog()` adapter can remain available for users who need it, but it would no longer be the primary path.

## Scope: This Is a 2.0

This is not an additive change. Switching the foundational data source, rethinking the sources API, and adding benchmark integration will affect the entire public API surface. This should be treated as a **pickai 2.0** — a clean break from 1.x.

Things to evaluate for the 2.0 API audit:

### What might be removed
- `parseOpenRouterCatalog()` — likely unnecessary if models.dev is the sole source. Evaluate whether there's any real use case for keeping it.
- The `pickai/adapters` subpath export — may be replaced entirely by `pickai/sources` or folded into main exports.

### New capabilities from models.dev data
Evaluate which of these become first-class API additions:
- `supportsReasoning()` — reasoning boolean is now available
- `isOpenWeights()` — open_weights boolean is now available
- `supportsStructuredOutput()` — structured_output boolean is now available
- `supportsAttachments()` — attachment boolean is now available
- Model status filtering — alpha/beta/deprecated (exclude unstable models from recommendations by default?)
- Knowledge cutoff — could be a scoring criterion (prefer models with more recent training data)
- Reasoning token pricing — relevant for cost scoring when reasoning models are in play

### Existing API that may need adjustment
- **`Model` type** — needs to accommodate models.dev fields (reasoning, open_weights, structured_output, attachment, status, knowledge cutoff, granular pricing). This ripples through `ClassifiedModel`, `EnrichedModel`, `ScoredModel<T>`, etc.
- **`classifyTier()`** — currently uses naming patterns + pricing. With explicit capability booleans, tier classification could be more accurate.
- **`classifyCostTier()`** — models.dev has reasoning token pricing; cost classification may need to account for this.
- **`enrich()` / enrichers** — `withAaSlug()` may change shape. `withClassification()` may gain new fields. Evaluate the full enrichment pipeline.
- **`recommend()` / `PurposeProfile`** — the `require` and `exclude` options need to support new capabilities (reasoning, open_weights, structured_output). The `benchmarks` field on profiles is new.
- **Built-in `Purpose` profiles** — may need to be rethought with richer metadata available. Profiles that were thin (cost + recency + context) can now use reasoning, open_weights, etc.
- **Capability checks** — `supportsTools()`, `supportsVision()`, `isTextFocused()` stay but are joined by new checks. Evaluate if the naming/pattern is still right.
- **ID utilities** — `normalizeModelId()`, `matchesModel()`, etc. may need adjustment since models.dev uses AI SDK model IDs as primary keys, which is a different ID scheme than OpenRouter's `provider/model` format.
- **Formatting** — `formatPricing()` may need to handle reasoning token pricing, cache pricing, audio pricing.

### What stays
- The core scoring engine (`scoreModels()`, `selectModels()`, `ScoringCriterion` interface) — this is data-source agnostic
- The composable criteria pattern — custom criteria still work the same way
- `groupByProvider()` — still useful, possibly enhanced with provider metadata from models.dev

## Testing Strategy for 2.0

### Current state (v1.0)
- 326 tests across 14 test files, all passing
- Co-located tests (`foo.ts` + `foo.test.ts`)
- One fixture file: `src/__fixtures__/openrouter-models.json` — a real OpenRouter API snapshot used by integration tests
- Integration test (`integration.test.ts`) runs a full pipeline: parse fixture → enrich → recommend/score/select/group → assert on real model data
- Smoke test (`smoke.test.ts`) verifies all public exports exist
- Unit tests cover each module in isolation with inline mock models

### What changes in 2.0

**New fixture needed:** A models.dev API snapshot (`models-dev.json` or similar) to replace/supplement the OpenRouter fixture. This is the foundation — all integration tests will run against it.

**Source testing:** Sources introduce async I/O (fetch calls). Testing strategy needs to address:
- **Unit tests for source parsing logic** — given a fixture of raw models.dev JSON, does the source produce correct `Model[]`? Same for benchmark source parsing. These stay pure and fast.
- **Source fetch mocking** — integration tests should NOT hit real APIs. Mock/stub the fetch layer so `openRouter()`, `artificialAnalysis()`, and a new `modelsDev()` source return fixture data.
- **Contract tests** — periodically validate that real API responses still match the shape our parsers expect. This could be a separate test suite that hits live APIs (CI-only, not blocking). When models.dev or AA change their schema, we find out here.

**`createPicker()` integration tests:** The new wiring layer needs end-to-end tests:
- `createPicker(modelsDev())` → `pick.recommend(Purpose.Balanced)` → assert results make sense
- `pick.recommend(Purpose.Coding, { benchmarks })` → assert benchmark data actually influences scores
- `pick.recommend(Purpose.Coding)` without benchmarks → assert it throws with a clear error message

**New capability tests:** If we add `supportsReasoning()`, `isOpenWeights()`, `supportsStructuredOutput()`, etc., each needs unit tests against the new fixture data that actually has those fields populated.

**Slug validation — do the IDs we return actually work?** This is a critical gap. pickai produces model IDs (via `apiSlugs`) that consumers pass to AI SDKs and provider APIs. If those slugs are wrong, the recommendation is useless regardless of how good the scoring is. We need to verify that the IDs we hand back are actually callable.

Approaches to explore (from cheapest to most expensive):

1. **Type-level validation against AI SDK** — The Vercel AI SDK likely exports typed model ID literals or enums. If so, we could write compile-time checks that our slug derivation produces values that match the SDK's known model IDs. Zero cost, catches drift at build time. **Investigate this first.**

2. **API catalog validation (no LLM calls)** — Many providers have "list models" endpoints (OpenAI's `/v1/models`, Anthropic's `/v1/models`, etc.) that return valid model IDs without making inference calls. We could fetch these and assert our slugs appear in the list. Costs nothing beyond API key auth. Could also validate against the OpenRouter catalog endpoint the same way.

3. **Minimal inference calls** — If the above aren't sufficient, make actual LLM calls with a trivial prompt ("say hi") and tiny `max_tokens` to confirm the slug resolves. This costs money but is the only way to be 100% sure. Would need API keys for each provider (or just OpenRouter + one direct provider to validate both slug formats). Could be a separate CI job that runs on a schedule, not on every commit.

4. **Test with AND without AI SDK** — We should validate slugs in both contexts: via AI SDK (where types might help) and via direct HTTP calls to provider APIs (where we're just passing a string). These are different code paths on the consumer side and different slug formats (`apiSlugs.direct` vs the AI SDK model ID).

This is a "dig into later" item but it's important. The whole value of pickai falls apart if the model IDs it recommends can't actually be used to make calls.

**Regression coverage:** Every existing public API behavior that survives into 2.0 should have its test preserved or migrated. The smoke test should be updated to reflect the new export surface. Any removed exports (e.g., `parseOpenRouterCatalog`) should have their smoke test entries removed.

**Scoring validation:** With richer metadata available, the scoring tests should verify that new dimensions actually affect results. For example: given two otherwise-identical models where one has `reasoning: true`, a profile that weights reasoning should rank it higher. This is the "are we getting the values we expect" guarantee.

## Value Proposition — Needs Rewrite

The current README description (and how LLMs describe pickai) focuses on *what it does* mechanically — "parses model data, enriches it, recommends models." It reads like a utility library description, not a problem statement.

ChatGPT's summary for reference:
> PickAI is a utility library that helps developers select the right AI model for their needs. Rather than just giving you a list of available models, it evaluates them based on pricing, performance tiers, and capabilities. Built around OpenRouter's model catalog, it parses model data, enriches it with useful fields, and provides functions to recommend the best models for specific purposes—like cost efficiency or quality. In essence, it eliminates the need to hardcode model selection logic in each app. It's lightweight, has no runtime dependencies, and works in any JavaScript environment.

Problems with this framing:
- "Built around OpenRouter's model catalog" — will be wrong after the models.dev switch, but more importantly it leads with an implementation detail rather than the value
- "Parses model data, enriches it with useful fields" — describes plumbing, not the problem being solved
- "Eliminates the need to hardcode model selection logic" — this is the closest to the real value but it's buried at the end
- Doesn't convey *why* model selection is hard or why you'd want a library for it
- Doesn't hint at the benchmark-informed scoring layer that makes this more than a filter

**Two core use cases** that the description must account for:

1. **Runtime model discovery** — Your app shows users models they can choose from, and those models stay current without app updates. Example: AI Consensus asks multiple models a question. Users need to see *every available model*, including ones that launched after the app was deployed. pickai provides dynamic, scored, filterable model lists based on live data. The app doesn't hardcode models — it delegates to pickai and gets fresh recommendations every time. This generalizes to any app with a model chooser, model comparison, or model routing.

2. **Build-time candidate selection** — You're developing an app with a specific use case and need to find the best models for it. You don't want to hand-test every model — you want a shortlist of strong candidates to evaluate. Example: Review Kit needed models that perform well for code review. pickai provided a ranked starting list, which was then validated through evalite tests. The final shipped list is static, but pickai's value was in narrowing the field from hundreds to a handful of strong candidates worth testing. This is pickai as a development tool, not a runtime dependency.

**The common thread:** The model landscape changes constantly. Whether you need live data in production or a smart starting point during development, the alternative is manual research that goes stale immediately. pickai's value is that it replaces that manual work with structured, repeatable, data-driven selection — and it stays current because the data sources do.

**TODO for 2.0:** Rewrite the README top-matter to lead with the problem and these use cases, not the mechanics. The description should make a developer immediately understand:
1. What problem this solves (model selection is complex, changes constantly, involves tradeoffs across multiple dimensions)
2. The two ways it helps (runtime discovery for apps that surface models to users, build-time selection for developers choosing which models to ship with)
3. How it solves it (smart defaults that work out of the box, benchmark data for precision when you need it)
4. Why they should use it instead of hardcoding or building their own (the landscape moves too fast, the data sources are already wired up, the scoring is composable)

This should be revisited after the API shape is finalized, since the 2.0 capabilities (sources, benchmark integration, richer metadata) fundamentally change what pickai can claim to do.

## Open Questions

- **Naming:** `createPicker` vs something else? The "picker" name is the library name (pickai) so it fits, but worth considering alternatives.
- **`BenchmarkSource` return type:** What fields does `BenchmarkScores` have? Needs to map to what AA actually provides (`quality_index`, `coding_index`, `speed`, etc.) while staying generic enough for other benchmark sources.
- **Purpose profiles:** How many benchmark-aware built-in profiles should we ship? `Purpose.Coding`, `Purpose.Creative` seem clear. What else?
- **models.dev source:** Worth building as a second `ModelSource`? How much does its catalog overlap with OpenRouter?
- **New capability checks:** Should `supportsReasoning()` and `isOpenWeights()` be part of this change or a separate one?
- **Subpath exports:** Sources likely live at `pickai/sources` for tree-shaking. Does the current `pickai/adapters` subpath merge into sources or stay separate?
- **Caching:** Should sources handle caching/TTL internally, or is that the user's concern?

## Evolution of Built-in Profiles

Today's profiles use `recency` as a proxy for model quality (newer = better). With benchmark sources:

| Profile | Today | With Benchmarks |
|---------|-------|-----------------|
| `Purpose.Cheap` | cost 70%, context 30% | unchanged — benchmarks optional |
| `Purpose.Balanced` | cost 30%, recency 40%, context 30% | could add quality benchmark |
| `Purpose.Quality` | cost 10%, recency 70%, context 20% | quality benchmark replaces recency as primary signal |
| `Purpose.Coding` | doesn't exist | coding benchmark 50%, context 30%, cost 20% |
| `Purpose.Creative` | doesn't exist | creative benchmark 60%, context 30%, cost 10% |
