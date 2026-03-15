# Changelog

## 2.0.0

### BREAKING

- **Data source switched from OpenRouter to models.dev.** The catalog now comes from [models.dev/api.json](https://models.dev/api.json) which provides structured capability fields (`reasoning`, `openWeights`, `structuredOutput`, `attachment`), knowledge cutoff dates, and model status that OpenRouter did not expose.
- **`createPicker()` / `createAdvisor()` removed.** `find()` and `recommend()` are now standalone functions that accept a `Model[]` directly. Old: `const pick = await createPicker(modelsDev()); pick.find(...)`. New: `const models = await fromModelsDev(); find(models, ...)`.
- **`fromModelsDev()` returns `Promise<Model[]>` directly.** No longer returns a factory function. Old: `const source = fromModelsDev(); const models = await source()`. New: `const models = await fromModelsDev()`.
- **`Model` shape redesigned.** `apiSlugs` map replaced by `id` (models.dev / direct API / AI SDK format) and `openRouterId` (OpenRouter slug, derived automatically). New fields: `knowledge`, `status`, `sdk`, `family`, `openWeights`, `attachment`. Enricher functions (`withClassification`, `withDisplayLabels`, `withAaSlug`) and their types removed.
- **`FindOptions.sort` no longer accepts `"costAsc"` string.** Use `sortByCost("asc")` instead. The sort field now accepts only comparator functions.
- **`selectModels()` removed from public API.** Use `recommend()` with `constraints` and `limit` options instead.
- **ID utilities removed from public API** (`normalizeModelId`, `parseModelId`, `resolveProvider`, `extractDirectModelId`, `toOpenRouterFormat`, `toDirectFormat`, `extractVersion`, `deriveOpenRouterId`, `ParsedModelId`). Use `matchesModel()` for ID comparison. The `Model` object already has pre-computed `id`, `provider`, and `openRouterId` fields.

### Added

- **`Purpose.Coding`, `Purpose.Creative`, `Purpose.Reasoning`** built-in profiles. Six profiles total: `Cheap`, `Balanced`, `Quality`, `Coding`, `Creative`, `Reasoning`.
- **`outputCapacity` scoring criterion.** Larger output limits score higher. Used in all profiles except `Cheap`.
- **`knowledgeFreshness` scoring criterion.** More recent knowledge cutoffs score higher.
- **`minMaxCriterion(getValue, invert?)` helper.** Creates a min-max normalized `ScoringCriterion` from a value extractor function. Eliminates boilerplate when building custom criteria from external data like benchmarks.
- **Sort comparator functions:** `sortByCost(dir?)`, `sortByRecency(dir?)`, `sortByContext(dir?)`, `sortByOutput(dir?)`. Each accepts `"asc"` or `"desc"`. Models with missing data sort last.
- **Provider constants:** `DIRECT_PROVIDERS` (providers with direct APIs), `OPENROUTER_PROVIDERS` (all providers available via OpenRouter, superset of direct), `ALL_KNOWN_PROVIDERS` (deduplicated union). Simple arrays you can spread and extend for use with the `providers` filter.
- **`matchesModel(a, b)` exported** for fuzzy ID comparison across formats (handles provider prefixes, date suffixes, dots vs hyphens, case).
- **`parseModelsDevData(data)` exported** for parsing raw models.dev JSON without the fetch wrapper.

### Changed

- **`costEfficiency` no longer treats unknown pricing as free.** Models without `cost` data now score 0 instead of scoring as the cheapest option.
- **`Purpose.Cheap` criteria adjusted** from `costEfficiency(7) + contextCapacity(3)` to `costEfficiency(7) + recency(1)`.
- **All profiles updated with `outputCapacity`** and rebalanced weights. `costEfficiency` kept at low weight in non-Cheap profiles to prevent expensive models from dominating when candidates score similarly.
- **`Purpose.Coding` filter simplified** to `{ toolCall: true }` only. The `structuredOutput` field has limited coverage in models.dev (under 40% of models report it), causing Anthropic and other providers to be silently excluded.

### Removed

- **`createPicker()` / `createAdvisor()` / `Picker` type** — replaced by standalone functions with explicit data flow.
- **`selectModels()` / `SelectOptions`** — internal to `recommend()`.
- **Enricher functions** (`withClassification`, `withDisplayLabels`, `withAaSlug`) and their types (`ClassifiedModel`, `LabeledModel`, `AaSlugModel`, `ApiSlugs`).
- **`versionFreshness` criterion** — replaced by `knowledgeFreshness`.
- **`"costAsc"` sort preset** — replaced by `sortByCost("asc")`.

## 1.0.0

### BREAKING

- **`apiId` and `openRouterId` replaced by `apiSlugs` map.** `Model.apiId` is now `Model.apiSlugs.direct` (optional). `Model.openRouterId` is now `Model.apiSlugs.openRouter`. The new `ApiSlugs` interface also supports `artificialAnalysis` for benchmark data lookups.
- **`PurposeProfile.weights` replaced by `criteria`.** Profiles now use `criteria: WeightedCriterion[]` instead of `weights: { cost, quality, context }`. This removes the hidden mapping where `quality` was silently split into `versionFreshness + recency`. Custom criteria (including external benchmark data) can now be passed directly to `recommend()`.
- **`Purpose.Coding`, `Purpose.Creative`, and `Purpose.Reviewer` removed.** Domain-specific profiles require benchmark data to meaningfully evaluate quality. Built-in profiles are now `Cheap`, `Balanced`, and `Quality`. See the [Scoring guide](docs/scoring.md#domain-specific-profiles) for coding and creative writing examples using custom criteria.

### Added

- **`ApiSlugs` type** — typed interface for `apiSlugs` on `Model` with `openRouter`, `direct?`, and `artificialAnalysis?` fields.
- **`withClassification()`** — composable enricher that adds `tier` and `costTier`. Returns `ClassifiedModel`.
- **`withDisplayLabels()`** — composable enricher that adds `providerName`, `priceLabel`, `contextLabel`. Returns `LabeledModel`.
- **`withAaSlug()`** — composable enricher that derives and adds `apiSlugs.artificialAnalysis` for Artificial Analysis benchmark lookups. Returns `AaSlugModel`.
- **`scripts/check-aa-slugs.ts`** — validation script that cross-references OpenRouter fixture against live AA data to verify slug derivation accuracy.
- **Custom scoring guide** (`docs/scoring.md`) — `ScoringCriterion` signature, min-max normalization convention, and a complete Artificial Analysis benchmark integration example.

### Changed

- **`EnrichedModel` decomposed** into `ClassifiedModel & LabeledModel`. `enrich()` still returns the same fields and works identically — the underlying types are just decomposed so consumers can import `ClassifiedModel` or `LabeledModel` independently.
- **Built-in profiles simplified to 3 general-purpose profiles** (`Cheap`, `Balanced`, `Quality`), using `recency` as the primary capability signal. `versionFreshness` remains exported for custom scoring but is no longer used in built-in profiles.
- **`Purpose.Cheap` scores purely on cost (70%) and context (30%)** — no recency signal, since the intent is "cheapest model that works."
- **Documentation restructured** from a single `docs/api.md` into focused pages: `api.md` (index + types), `getting-started.md`, `scoring.md`, `classification.md`, `utilities.md`.
