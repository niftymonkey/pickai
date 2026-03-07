# Changelog

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
