# Changelog

## 1.0.0

### BREAKING

- **`apiId` and `openRouterId` replaced by `apiSlugs` map.** `Model.apiId` is now `Model.apiSlugs.direct` (optional). `Model.openRouterId` is now `Model.apiSlugs.openRouter`. The new `ApiSlugs` interface also supports `artificialAnalysis` for benchmark data lookups.

### Added

- **`ApiSlugs` type** — typed interface for `apiSlugs` on `Model` with `openRouter`, `direct?`, and `artificialAnalysis?` fields.
- **`withClassification()`** — composable enricher that adds `tier` and `costTier`. Returns `ClassifiedModel`.
- **`withDisplayLabels()`** — composable enricher that adds `providerName`, `priceLabel`, `contextLabel`. Returns `LabeledModel`.
- **`withAaSlug()`** — composable enricher that derives and adds `apiSlugs.artificialAnalysis` for Artificial Analysis benchmark lookups. Returns `AaSlugModel`.
- **`scripts/check-aa-slugs.ts`** — validation script that cross-references OpenRouter fixture against live AA data to verify slug derivation accuracy.

### Changed

- **`EnrichedModel` decomposed** into `ClassifiedModel & LabeledModel`. `enrich()` still returns the same fields and works identically — the underlying types are just decomposed so consumers can import `ClassifiedModel` or `LabeledModel` independently.
