# pickai 2.0 — Sources API Brief

## Problem

Every pickai consumer writes the same boilerplate: fetch OpenRouter catalog, parse it, optionally fetch Artificial Analysis benchmarks, build lookup maps, wire custom scoring criteria. The library should handle this.

## Proposed API

```typescript
import { createPicker, modelsDev, artificialAnalysis, Purpose } from "pickai"

const pick = await createPicker(modelsDev())

// Metadata-only — works out of the box
pick.recommend(Purpose.Balanced)

// Benchmark-informed — benchmarks provided at the call site
const benchmarks = await artificialAnalysis()
pick.recommend(Purpose.Coding, { benchmarks })
```

Profiles that reference benchmark fields without benchmarks being passed **throw** — no silent degradation.

Purpose profiles declare benchmark intent by field name:

```typescript
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

## Key Decisions Made

1. **One entry point** — `createPicker(source)` takes a single `ModelSource`. No overloads, no variants.
2. **Benchmarks at the call site** — passed to `recommend()`, not to `createPicker()`. Makes it explicit what data informs each recommendation.
3. **"Source" as the term** — not "adapter" (already used for parse-only), not "provider" (overloaded in AI context).
4. **models.dev as the sole default source** — replaces OpenRouter. See [Why models.dev](#why-modelsdev) below.
5. **This is a 2.0** — breaking change to data source, `Model` type, enrichment pipeline, capability checks, possibly ID utilities. Not additive.
6. **No silent degradation** — if a profile needs benchmarks and none are provided, it's an error. If a source fetch fails, `createPicker()` or `artificialAnalysis()` rejects at construction/load time.

## How We Got Here (and What Still Doesn't Feel Right)

The proposed API above is the result of several iterations. Each solved one problem but revealed the next.

**Iteration 1: `createPicker({ models, benchmarks })`** — both sources passed at construction.
- Problem: when you read `pick.recommend(Purpose.Coding)` you can't tell what data is informing the result. Are benchmarks loaded? Did they fail? The call site hides what's actually happening.

**Iteration 2: Two entry points — `createPicker()` and `createBenchmarkPicker()`**
- Problem: too much ceremony. Now the user has to think about "which kind of picker do I have?" and the naming is clunky. The distinction should be simpler than a whole separate constructor.

**Iteration 3: One `createPicker()` with conditional return types** — returns `Picker` or `BenchmarkPicker` based on whether benchmarks were passed.
- Problem: same issue as #2 wearing a different hat. The user still has two different types to reason about, just hidden behind overloads. Too clever.

**Iteration 4: One `createPicker(source)`, benchmarks at `recommend()` call site** — the current proposal.
- Problem: silent degradation. What if a profile references benchmarks but none are passed? The first instinct was to gracefully ignore it, but that means a profile weighted 50% on coding benchmarks silently scores without them — results look correct but are completely different. That's worse than a crash. Fixed by making it a hard error.

**Where it still feels unresolved:** The current shape works mechanically, but there are DX questions we haven't fully answered:
- Does `recommend(Purpose.Balanced)` without benchmarks actually produce results worth trusting? If not, the whole "metadata-only path" may be misleading — it compiles, it runs, but is it good enough? (See "Is metadata-only recommendation valuable?" below.)
- The `benchmarks` option on `recommend()` is clean for one call, but if every `recommend()` call in your app needs benchmarks, you're passing the same object everywhere. Is that tedious or is that good explicitness?
- Purpose profiles with a `benchmarks` field that names specific benchmark dimensions (e.g., `{ field: "coding", weight: 0.5 }`) — how does the profile know what fields are available? Is there a type contract between profiles and benchmark sources?

These unresolved questions feed directly into the open questions below.

## Why models.dev

The `models` CLI ([arimxyer/models](https://github.com/arimxyer/models)) led us to [models.dev](https://models.dev) (by SST), which has a public API at `https://models.dev/api.json`. It provides everything OpenRouter does plus structured capability fields that OpenRouter lacks entirely.

| Field | OpenRouter | models.dev | Notes |
|-------|-----------|------------|-------|
| Pricing (input/output) | Yes | Yes | models.dev also has `reasoning`, `cache_read`, `cache_write`, audio pricing |
| Context window | Yes | Yes (context, input, output limits separately) | models.dev is more granular |
| Release date | Yes | Yes (`release_date` + `last_updated`) | |
| Modalities | Yes | Yes (input/output arrays) | |
| Tool calling | Via `supported_parameters` | `tool_call: boolean` | models.dev is explicit |
| **Reasoning** | **No** | **`reasoning: boolean`** | Gap in OpenRouter |
| **Open weights** | **No** | **`open_weights: boolean`** | Gap in OpenRouter |
| **Structured output** | **No** | **`structured_output: boolean`** | Gap in OpenRouter |
| **Attachments** | **No** | **`attachment: boolean`** | Gap in OpenRouter |
| **Model status** | **No** | **`alpha`/`beta`/`deprecated`** | Useful for filtering |
| Knowledge cutoff | No | `knowledge: "YYYY-MM"` | |
| Provider count | ~100+ | 85+ (community-maintained TOML files) | |
| AI SDK model IDs | No | Yes (used as primary key) | |

This directly affects the "is metadata-only recommendation valuable" question. With OpenRouter data, you're scoring on cost, context, and recency — thin. With models.dev, you can score on reasoning capability, open weights, structured output, model maturity, knowledge cutoff, and granular pricing — all without benchmarks. The answer to whether metadata-only recommendations are useful depends heavily on *which* metadata source you're using.

**Documentation impact:** When this switch happens, docs should clearly explain *why* models.dev was chosen — the richer structured metadata is what makes metadata-only recommendations meaningful. The narrative becomes: "pickai gives you smart recommendations out of the box. Add benchmark data and they get even better."

## Open Questions to Resolve

### Is metadata-only recommendation valuable?
The current profiles score on cost, recency, and context — thin signals. With models.dev, we'd add reasoning, open weights, structured output, model maturity, knowledge cutoff. **Evaluate:** is that enough for `recommend()` to be worth calling without benchmarks, or should benchmarks be required? This changes the API shape if the answer is "not valuable without benchmarks."

### API surface audit
What to evaluate for each existing export:

**Remove?**
- `parseOpenRouterCatalog()` — likely unnecessary if models.dev is the sole source
- `pickai/adapters` subpath — may be replaced by `pickai/sources` or folded into main exports

**Add?**
- `supportsReasoning()` — reasoning boolean now available from models.dev
- `isOpenWeights()` — open_weights boolean now available
- `supportsStructuredOutput()` — structured_output boolean now available
- `supportsAttachments()` — attachment boolean now available
- Model status filtering — alpha/beta/deprecated (exclude unstable models by default?)
- Knowledge cutoff — could be a scoring criterion (prefer models with more recent training data)
- Reasoning token pricing — relevant for cost scoring when reasoning models are in play

**Adjust?**
- `Model` type — needs models.dev fields (reasoning, open_weights, structured_output, attachment, status, knowledge cutoff, granular pricing). Ripples through `ClassifiedModel`, `EnrichedModel`, `ScoredModel<T>`, etc.
- `classifyTier()` — currently uses naming patterns + pricing. Explicit capability booleans could make it more accurate.
- `classifyCostTier()` — may need to account for reasoning token pricing.
- `enrich()` / enrichers — `withAaSlug()` may change shape. `withClassification()` may gain new fields.
- `recommend()` / `PurposeProfile` — `require` and `exclude` options need to support new capabilities. `benchmarks` field on profiles is new.
- Built-in `Purpose` profiles — may be rethought with richer metadata. Profiles that were thin (cost + recency + context) can now use reasoning, open_weights, etc.
- Capability checks — `supportsTools()`, `supportsVision()`, `isTextFocused()` stay but are joined by new checks. Evaluate if the naming/pattern is still right.
- ID utilities — `normalizeModelId()`, `matchesModel()`, etc. may need adjustment since models.dev uses AI SDK model IDs as primary keys (different from OpenRouter's `provider/model` format).
- `formatPricing()` — may need to handle reasoning token pricing, cache pricing, audio pricing.

**Keep as-is?**
- Core scoring engine: `scoreModels()`, `selectModels()`, `ScoringCriterion` interface — data-source agnostic
- Composable criteria pattern — custom criteria still work the same way
- `groupByProvider()` — still useful, possibly enhanced with provider metadata from models.dev

### Testing

**Current state (v1.0):** 326 tests across 14 test files. Co-located tests (`foo.ts` + `foo.test.ts`). One fixture: `src/__fixtures__/openrouter-models.json`. Integration test runs full pipeline: parse → enrich → recommend/score/select/group. Smoke test verifies all public exports.

**What 2.0 needs:**
- models.dev fixture to replace/supplement OpenRouter fixture
- Unit tests for source parsing logic (pure, against fixtures)
- Source fetch mocking — integration tests should NOT hit real APIs
- Contract tests — periodically validate real API responses still match our parsers (CI-only, not blocking)
- `createPicker()` integration tests: recommend with/without benchmarks, error on missing benchmarks
- New capability unit tests (`supportsReasoning()`, `isOpenWeights()`, etc.)
- Scoring validation — verify new dimensions actually affect results (e.g., model with `reasoning: true` ranks higher when profile weights reasoning)
- Updated smoke tests reflecting new export surface

**Critical gap — slug validation:** pickai produces model IDs (via `apiSlugs`) that consumers pass to AI SDKs and provider APIs. If those slugs are wrong, the recommendation is useless. We need to verify the IDs actually work.

Approaches (cheapest first):
1. **Type-level validation against AI SDK** — AI SDK likely exports typed model ID literals. Write compile-time checks that our slug derivation matches. Zero cost, catches drift at build time. **Investigate first.**
2. **API catalog validation (no LLM calls)** — providers have "list models" endpoints (OpenAI `/v1/models`, Anthropic `/v1/models`) that return valid IDs without inference. Assert our slugs appear. Free beyond API key auth.
3. **Minimal inference calls** — trivial prompt ("say hi"), tiny `max_tokens`, confirm slug resolves. Costs money but is the only 100% guarantee. Separate CI job, schedule-based.
4. **Test both paths** — validate with AI SDK (types may help) AND direct HTTP calls (just strings). Different code paths, different slug formats (`apiSlugs.direct` vs AI SDK model ID).

### Value proposition rewrite

Current framing (how ChatGPT describes pickai):
> PickAI is a utility library that helps developers select the right AI model for their needs. Rather than just giving you a list of available models, it evaluates them based on pricing, performance tiers, and capabilities. Built around OpenRouter's model catalog, it parses model data, enriches it with useful fields, and provides functions to recommend the best models for specific purposes—like cost efficiency or quality. In essence, it eliminates the need to hardcode model selection logic in each app.

Problems: leads with plumbing ("parses model data, enriches it"), buries the value ("eliminates hardcoding"), doesn't explain *why* model selection is hard, doesn't hint at benchmarks.

**Two core use cases** the description must account for:

1. **Runtime model discovery** — apps that surface models to users dynamically. Example: AI Consensus asks multiple models a question. Users need to see every available model, including ones launched after the app was deployed. pickai provides dynamic, scored, filterable model lists based on live data. The app doesn't hardcode models — it delegates to pickai and gets fresh recommendations every time. Generalizes to any app with a model chooser, model comparison, or model routing.

2. **Build-time candidate selection** — developers narrowing candidates for a specific use case before manual evaluation. Example: Review Kit needed models that perform well for code review. pickai provided a ranked starting list, which was validated through evalite tests. The final shipped list is static, but pickai's value was in narrowing hundreds of models to a handful worth testing. This is pickai as a development tool, not a runtime dependency.

**Common thread:** The model landscape changes constantly. Whether you need live data in production or a smart starting point during development, the alternative is manual research that goes stale immediately. pickai replaces that with structured, repeatable, data-driven selection — and it stays current because the data sources do.

**TODO:** Rewrite README to lead with the problem and these use cases. Do this after 2.0 API shape is finalized.

### Other open questions
- Naming: `createPicker` or something else?
- `BenchmarkScores` type shape — what fields, how generic?
- Which benchmark-aware profiles to ship (`Purpose.Coding`, `Purpose.Creative`, what else?)
- Subpath exports: `pickai/sources` replacing `pickai/adapters`?
- Caching: source-level or user's concern?
- Profile evolution with benchmarks:

| Profile | Today | With Benchmarks |
|---------|-------|-----------------|
| `Purpose.Cheap` | cost 70%, context 30% | unchanged — benchmarks optional |
| `Purpose.Balanced` | cost 30%, recency 40%, context 30% | could add quality benchmark |
| `Purpose.Quality` | cost 10%, recency 70%, context 20% | quality benchmark replaces recency |
| `Purpose.Coding` | doesn't exist | coding benchmark 50%, context 30%, cost 20% |
| `Purpose.Creative` | doesn't exist | creative benchmark 60%, context 30%, cost 10% |

## Reference

- Current pickai docs: `docs/getting-started.md`, `docs/scoring.md`, `docs/classification.md`, `docs/utilities.md`, `docs/api.md`
- models.dev: `https://models.dev/api.json` — [repo](https://github.com/sst/models.dev) — community-maintained, open-source, backed by SST
- Artificial Analysis: `https://artificialanalysis.ai/api/models`
- `models` CLI (inspiration): [arimxyer/models](https://github.com/arimxyer/models) — Rust TUI/CLI that consumes models.dev + AA data
