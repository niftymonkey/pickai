# v3 API findings from building the web app

Running log. Decision 9.18 made the web app the pressure test on the redesign; this file is where
the pressure test reports. Each entry says what the app needed, what the library offers today, and
what v3 should do about it. Updated as the UI iterates.

Started 2026-08-30 during the first build of the core decision surface.

## 1. Model-identity grouping is mandatory, and it is not `perModel`

The raw catalog is ~7,300 listings for ~1,884 models. An honest table without grouping shows 30
consecutive "Claude Opus 5" rows from 30 resellers; the surface is unusable. The app had to group
listings by model identity, keep every seller inside the group, and elect a representative.

`perModel(n)` dedupes by dropping listings during selection. The UI needs the opposite: keep all
listings, folded under one identity. **v3 candidate: a `groupByModel(models)` that returns
identities with their listings attached**, sharing the ID normalization the join uses.

## 2. The 9.29 exports were needed three times in one afternoon

The web app reimplemented internal library logic three separate times:

- an ID normalizer for the group key (stand-in for `normalizeModelId`),
- effort-suffix folding for the benchmark join (9.14 requires it; only the library-internal parse
  knows variants),
- maker inference for the representative listing (stand-in for internal `inferProvider`, done as a
  hand map of family to home provider).

9.29 already covers exporting `normalizeModelId`, `parseModelId`, `resolveProvider`. This is
confirmation from our own first consumer, before any BYOD user ever showed up.

## 3. "Maker" and "seller" are different facts, and the catalog only models one

Mark's reaction to the first table: Anthropic buried as one of 33 sellers inside a Claude group is
wrong. The maker is the anchor fact; resellers are footnotes. models.dev's `provider` field means
"seller of this listing." Nothing in the data says "this model belongs to Anthropic" except the
`family` field plus inference. **v3 candidate: expose maker (via `resolveProvider`/`inferProvider`
or a field), so consumers can anchor groups without a hand map.** The representative-listing rule
that felt right: maker first, then any `DIRECT_PROVIDERS` seller, then cheapest known listing.

## 4. "Times the cheapest" only works on a short list

Against 1,884 survivors the multiple reads "×2174" and is noise. Against a few dozen it is exactly
the honest comparison 9.22 wanted. The app gates multiples to 50 or fewer survivors. Carry this
into how the docs frame the comparison: it belongs to the shortlist stage, not the catalog stage.

## 5. The explanation shape a UI actually wants is per-step, not per-removal

9.31 says filtering returns removed models tagged with the rule that cut them. Building the rules
rail showed the load-bearing shape is smaller: per rule applied, in order, `cut` and `remaining`
counts. That is what "watch the count drop" renders from. The removed-models detail matters for
"why is my favorite model gone," but the step summary is the hot path. **v3: return both cheaply;
the steps summary should not require materializing the removed lists.**

## 6. Shapes that survived contact intact

- The 9.27 collision carriage (all configs, best-config-labeled sort key, spread visible) rendered
  naturally as "1468, 2 configs 1455-1468 (best: claude-opus-5-high)". No friction.
- The 9.23 fence semantics (unknown price never cut) implemented in one line and read honestly.
- The `BenchmarkSet`/`metrics` shape (9.28) mocked cleanly; nothing downstream cared where scores
  came from.

## 7. Listings vs models: counts need both numbers

Every count shown to a user must say which it is. The app renders "1,884 models, counting each
model once across 7,300 listings." A library consumer computing "the catalog has N" from raw
length gets the misleading number. Grouping (finding 1) is what makes the honest number cheap.

## 8. The real `fromArena` works, and here is its shape

Prototyped 2026-08-30 in `web/lib/benchmarks.ts` against the live dataset, replacing an earlier
fabricated mock (which taught its own lesson: "mocked" labels get read as "cached real data."
Never fabricate values; fetch or leave absent).

- Endpoint: `datasets-server.huggingface.co/rows` with `config=text_style_control`,
  `split=latest`. No key. Plain JSON. ~300-400 `overall` rows.
- The split is **ordered by category with `overall` first**, so paging 100 at a time and stopping
  at the category edge costs 4 requests. The `/filter` endpoint exists but its index was cold
  (502s, then "index is loading"); do not depend on it.
- Row schema: `model_name`, `organization`, `license`, `rating`, `rating_lower`, `rating_upper`,
  `variance`, `vote_count`, `rank`, `category`, `leaderboard_publish_date`.
- **`organization` is the maker fact from finding 3, from a real source.** The v3 join can carry
  it through and replace the hand map for every rated model.
- `license` per row means the BYOD schema's optional license can be per-model, not only per-set.
- `vote_count` renders beside the score as provenance weight; cheap and worth carrying.
- Failure path: fetch can fail; the UI renders "Score: LMArena unavailable (reason)" and the app
  keeps working with every model unrated. Absent with a reason, never zero (rule 1).

## 9. "Where did my model go" needs per-model cut lookup

Mark's ask: search for a specific model inside the filtered results. The honest answer when it is
gone is the rule that removed it. The app implements `explainCut(model, rules)`: replay the rules,
return the first that fails. This is the per-removal half of 9.31 confirmed by a real feature, and
it wants to be a cheap targeted lookup, not a materialized removed-list scan.

## 10. Catalog quirks the app had to absorb

- Reseller `$0` prices (known catalog errors, see Data Sources caveat) would win any
  cheapest-seller election; the representative election skips zero prices.
- Some listings carry contradictory metadata for the same model (context 1M vs 128K max output on
  the same Opus listing across sellers). Seller sub-rows display them as-is; the group anchor uses
  the maker's numbers.

## 11. Explanation counts must state their unit, and both units matter

Finding 7 said listings and models are different counts; the mobile build showed what happens
when the surface forgets it. The count header said "1,410 of 1,884 models" while the rule card
under it said "6,269 left" (listings). Same pipeline, two units, no label: it reads like a bug
even when every number is right. The fix made each pipeline step carry both counts
(`cut`/`remaining` in listings, `cutModels`/`remainingModels` in model identities), and the UI
leads with models because that is the unit users think in. A rule can cut hundreds of listings
and zero models (a reseller-only cut); that case needs its own sentence, not a "cut 0".
v3's per-step explanation shape (9.31) should return both units per step so no consumer has to
re-derive one from the other.

## 12. The pipeline's unit is the model identity, not the listing

Finding 11's dual-unit patch was treating the symptom. The disease: the prototype pipeline
filtered listings, so a $10 input fence kept Claude Fable's maker listing and silently killed its
$12 resellers, leaving a seller list of only $0 catalog errors and unknowns. Mark read it
correctly as the app turning into "where can you buy it cheapest." The fix inverted the order:
group listings into model identities first, then rules evaluate the model (its representative
listing). Step counts become model counts natively.

One rule class is the exception: provider allow/exclude is about who you will buy from, so it
prunes a model's seller listings, re-elects the representative from the survivors, and the model
dies only when no acceptable seller remains. Honest consequence: "Never anthropic" keeps Claude
models alive when resellers still carry them. v3's `find`/`recommend` should take the grouped
model as the unit of filtering (9.24), with listing-pruning semantics only for seller-scoped
facts, and normalizeModelId/grouping (9.29) has to run before filtering, not after.

Presentation lesson riding along: seller listings are provenance detail, not the answer. The UI
demoted them (quiet count, "Also sold by", alphabetical, never cheapest-first).

## 13. The weight mechanism lives, but over metrics, and it must stay name-blind

Mark asked where v2's weighted criteria went. The settled answer held up in practice: weights over
named benchmark metrics (9.32), never over catalog facts. The app now fetches six LMArena
categories (overall, coding, math, hard prompts, creative writing, instruction following) and the
Score column becomes a user-weighted blend with a visible label ("= 50% Overall + 50% Coding").
What the build taught:

- **Metric names must be opaque everywhere.** The blend function takes `Record<name, weight>`, the
  join carries whatever metric names the set contains, and the UI lists metrics from the data with
  labels as a fallback map. A BYOD upload with `if_score` or `tau_banking` flows through with zero
  code changes. v3's `recommend` ordering weights should be typed over `string`, not a union.
- **Blend coverage is its own display state.** A model missing some weighted metrics gets a
  renormalized blend plus a visible "2/3 metrics" note; a model missing all of them is unrated.
  Absent stays absent (rule 1), partial says it is partial.
- **Single-metric blends must pass through untouched** so provenance (votes, rival configs, best
  config label) survives; notes only collapse when two or more metrics actually mix.
- **Finding 8 reconfirmed the hard way:** the HF /filter endpoint went cold again mid-build.
  Category data now comes from paging the whole split (~105 pages, parallel, retried), cached per
  process. fromArena in the library should do the same and never touch /filter.

## 14. Maker is a first-class filterable fact, and family cannot carry it

A real policy scenario (a government shop that bans everything Anthropic made, not just
Anthropic-the-seller) forced maker into the rule system: "Never made by anthropic" must kill every
Claude listing regardless of seller. Seller rules cannot express this; the two kinds now coexist
("Who made it" vs "Who sells it"). Unknown maker survives an exclude and fails an allow, per the
absent-data rule. Implementation lesson: the catalog's `family` field is mostly absent, so maker
inference falls back to the normalized-id prefix map; v3 should expose maker/`inferProvider`
properly (the 9.29 export, fourth sighting) rather than leaving every consumer to rebuild this.
Also: the app's search now matches every text fact (name, id, seller, family, modalities), which
is only possible because grouping happens before search.
