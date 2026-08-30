# Joining third-party benchmark data to the models.dev catalog

Research note for the proposed built-in benchmark quality adapter.
Measured 2026-08-29 against live data. All numbers below were computed, not estimated.

## Summary of the measurements

| Question | Answer |
| --- | --- |
| models.dev catalog size | 211 providers, 7,488 provider-model entries, 3,558 distinct model IDs, 2,226 distinct IDs after `normalizeModelId` |
| LMArena source the example uses (`nakasyou/lmarena-history`) | 243 rated models, last updated 2025-05-23, **dead for 15 months** |
| Join rate with today's `matchesModel` (that source) | 73 / 243 arena rows = **30.0%** |
| Best free LMArena source found (`lmarena/arena-catalog`) | 282 rated models, last updated 2025-12-17 |
| Join rate with today's `matchesModel` (that source) | 115 / 282 arena rows = **40.8%** |
| Same source, top 50 arena models by rating | 36 / 50 = **72%** |
| Catalog-side coverage (direct providers, not deprecated, text-to-text) | 19 / 112 = **17.0%** |
| Catalog-side coverage, 30 most recently released such models | **0 / 30** |

The string matching is a real but tractable problem. The freshness of the free
benchmark data is the problem that actually decides whether the feature works.

## 1. What the code does today

There is no `src/identity.ts`. The identity logic lives in `src/id.ts`, and the
only exported piece is `matchesModel`.

`normalizeModelId` (`src/id.ts:39`) applies four steps: strip anything before the
first `/`, replace `.` with `-`, strip a trailing `-` followed by exactly 8 digits,
lowercase. `matchesModel(a, b)` is string equality of the two normalized forms.
`deriveOpenRouterId` runs the opposite direction (catalog ID to OpenRouter slug)
and is used only at parse time in `src/source.ts:96`.

All four benchmark examples use the identical technique:

```ts
// examples/lmarena-benchmarks.ts
const match = benchmarks.find((b) => matchesModel(b.modelId, m.id));
return { ...m, arena: match?.score };
```

`examples/aa-benchmarks.ts`, `examples/multi-benchmark.ts` and
`examples/agent-workload.ts` do the same with `b.slug` in place of `b.modelId`.
So the join is: normalize both sides, take the **first** array element that
compares equal, attach its score, and leave the field `undefined` when nothing
matches. Since PR #23, `undefined` means "uncovered" rather than zero, which is
why the failure is currently quiet rather than wrong.

Two fragilities are structural, not incidental:

1. **`find` returns the first match, and "first" is source key order.** When
   several benchmark rows normalize to the same key, the example silently keeps
   whichever the leaderboard happened to list first, with no signal that a choice
   was made.
2. **The catalog side fans out and the benchmark side collapses.** One arena row
   is copied onto every catalog entry that normalizes to the same key. For
   `llama-3-3-70b-instruct` that is 30 catalog entries, for `qwen3-32b` 21, for
   `o3-mini` 20. `perModel(1)` cleans up the ranking afterwards, but the score is
   applied 30 times first.

## 2. Live measurements

### models.dev (`https://models.dev/api.json`, 4.4 MB)

211 providers, 7,488 provider-model entries, 3,558 distinct model IDs.
`normalizeModelId` collapses those 3,558 down to 2,226, which is itself a
9-in-10-thousand-scale hint that the normalizer is lossy: 1,332 distinct catalog
IDs become indistinguishable from some other catalog ID.

Field census across all 7,488 entries: `id`, `name`, `description`, `attachment`,
`reasoning`, `tool_call`, `release_date`, `last_updated`, `modalities`,
`open_weights`, `limit` are universal; `cost` 7,053; `family` 6,821;
`knowledge` 3,982; `status` 270; `experimental` 38. **There is no alias field,
no canonical-model field, and no benchmark field.** Nothing in the catalog helps
with the join.

### LMArena via `nakasyou/lmarena-history` (what `examples/lmarena-benchmarks.ts` fetches)

The fetch works and returns 18.5 MB. It contains 117 dated snapshots from
20230508 to **20250522**. The repository's last commit is 2025-05-23. It has one
star. The example's data is fifteen months stale and is not coming back.

The latest snapshot's `text.overall` has 243 entries. Shape of the keys:

```
gemini-2.5-pro-preview-05-06   gemini-2.5-pro-exp-03-25    o3-2025-04-16
chatgpt-4o-latest-20250326     grok-3-preview-02-24        early-grok-3
llama-4-maverick-03-26-experimental                        gemini-exp-1206
deepseek-v3-0324               qwen2.5-max                 gemma-3-27b-it
llama-3.1-405b-instruct-fp8    claude-3-7-sonnet-20250219-thinking-32k
```

Result with today's `matchesModel`: **73 / 243 = 30.0%** of arena rows find a
catalog home. From the catalog side, 305 / 7,488 entries = 4.1% get a score, and
67 / 2,226 distinct normalized IDs = 3.0%.

### LMArena via `lmarena/arena-catalog` (found during this research)

`github.com/lmarena/arena-catalog` is under the LMArena org, last pushed
2025-12-17, 15 stars, no license file. `data/leaderboard-text.json` is 1.3 MB and
holds 29 category leaderboards (`full`, `coding`, `math`, `if`, `multiturn`,
`hard_6`, nine `industry_*` slices, eight languages, and others), each keyed by
arena model name with `rating`, `rating_q025`, `rating_q975`. `full` has 282
entries and reaches `gemini-3-pro`, `gpt-5.1-high`, `grok-4.1`, `glm-4.6`.

This is a strictly better source than the one in the example: fresher, official,
smaller, and it carries per-category ratings the current example cannot offer.
Its keys are also cleaner:

```
gemini-3-pro     grok-4.1-thinking      claude-opus-4-5-20251101
gpt-5.1-high     glm-4.6                claude-sonnet-4-5-20250929-thinking-32k
mistral-large-3  qwen3-max-preview      deepseek-v3.2-exp-thinking
```

Join with today's `matchesModel`: **115 / 282 = 40.8%**. Weighted by rating it
looks better, because the head of the leaderboard is exactly the well-known
models: top 10 = 6/10, top 25 = 18/25, top 50 = 36/50 (72%), top 100 = 68/100.

The HuggingFace space `lmarena-ai/arena-leaderboard` publishes 136 `elo_results_*.pkl`
dumps, but the newest is `elo_results_20250829.pkl`, exactly a year old.
`https://lmarena.ai/api/leaderboard` returns 403. **The freshest free LMArena data
we could locate anywhere is the arena-catalog JSON at 2025-12-17.**

### Artificial Analysis

`https://artificialanalysis.ai/api/v2/data/llms/models` returns
`{"error":"API key is required"}` with HTTP 401 and no key is present on this
machine, so the AA join rate is unmeasured. The three examples that use it join
on `m.slug` through the same `matchesModel` call, so it inherits every failure
mode below. AA slugs are hand-curated and shorter than API IDs
(`claude-4-5-sonnet`, `gpt-5-1-high`), which suggests the reasoning-variant and
version-shape problems apply there too.

## 3. Failure modes, with counts

Classification of the 167 unmatched rows in `arena-catalog`'s `full` leaderboard.

**Reasoning-effort and thinking-budget variants: 20 rows, 16 of which have a base
model that IS in the catalog.**

```
grok-4.1-thinking      gpt-5.1-high        gpt-5-mini-high
claude-opus-4-5-20251101-thinking-32k      claude-sonnet-4-5-20250929-thinking-32k
qwen3-235b-a22b-no-thinking                gemini-2.5-flash-lite-preview-09-2025-no-thinking
```

This is the interesting one, because it is not a string problem. LMArena rates a
*configuration*; models.dev catalogs a *model*. Fold the variants together and 16
catalog models end up holding two or more arena ratings each. The spreads are not
noise: `gpt-5.1` vs `gpt-5.1-high` differ by 25 Elo, `qwen3-235b-a22b` vs its
`-no-thinking` sibling by 25, `grok-4.1` vs `grok-4.1-thinking` by 8. Any adapter
has to decide max, min, or default-config, and that decision changes rankings.

**Date stamps in a shape the normalizer does not strip: 27 rows.** The regex only
handles `-\d{8}$`. Hyphenated ISO dates (11 rows) and short `MM-DD` / `MMYY`
stamps (16 rows) survive.

```
o3-2025-04-16     gpt-4.1-2025-04-14   o1-2024-12-17    o4-mini-2025-04-16
grok-3-preview-02-24                   qwen-plus-0125   qwen-max-0919
ernie-5.0-preview-1103                 hunyuan-turbo-0110
```

**Point-release suffixes: 6 rows.** `gemini-2.0-flash-001`, `gemini-1.5-pro-002`,
`gemini-1.5-flash-002`, `gemini-1.5-pro-001`. The catalog carries
`gemini-2.0-flash` with no suffix.

**Quantization suffixes: 2 rows.** `llama-3.1-405b-instruct-bf16` and
`-fp8` are two separately rated arena entries for one catalog model.

**Present in one source only: 84 rows** with no plausible catalog counterpart.
Retired models (`claude-1`, `bard-jan-24-gemini-pro`, `gpt-4-0314`), research
checkpoints (`llama-3.1-tulu-3-70b`, `olmo-2-0325-32b-instruct`,
`gemma-2-9b-it-simpo`), arena-only experiments (`early-grok-3`,
`amazon-nova-experimental-chat-10-20`, `mai-1-preview`), and models the catalog
simply does not carry (`yi-lightning`, `athene-v2-chat`, `qwen2.5-max`).

**Display names versus API IDs.** `arena-catalog`'s `scatterplot-data.json`
carries 141 hand-written `name` to `model_api_name` pairs, which is a direct
admission by LMArena that the mapping cannot be derived:

```
"GPT-4o"            -> "chatgpt-4o-latest-20241120"
"Gemini 1.5 Pro"    -> "gemini-1.5-pro-002"
"GLM-4-Plus"        -> "glm-4-plus-0111"
"Llama 3.1 405B"    -> "llama-3.1-405b-instruct-fp8"
"Claude 3.5 Sonnet" -> "claude-3-5-sonnet-20241022"
```

Matching those display names against the models.dev `name` field, after
lowercasing and stripping non-alphanumerics, gives 90 / 141 = 63.8%. Even those
141 hand-curated `model_api_name` values only reach models.dev 80 / 141 = 56.7%
of the time.

### The dangerous failure: silent collisions

`normalizeModelId` already collapses 5 keys on the `nakasyou` side. The worst:

```
chatgpt-4o-latest  <=  chatgpt-4o-latest-20250326 (1405)
                       chatgpt-4o-latest-20250129 (1371)
                       chatgpt-4o-latest-20241120 (1362)
                       chatgpt-4o-latest-20240903 (1336)
                       chatgpt-4o-latest-20240808 (1313)
```

Five ratings spanning 92 Elo points collapse onto one catalog entry, and `find`
keeps the first. `claude-3-5-sonnet` collapses two (spread 15), `reka-core` three
(36), `reka-flash` two, `hunyuan-turbos` two (57). Nothing in the pipeline
reports this. `coverage` reads 1.0 for a model whose score was picked arbitrarily.

## 4. What a looser matcher buys, and what it costs

I built an aggressive normalizer (strip hyphenated ISO dates, `-MM-DD`, four- and
three-digit suffixes, and the tokens `exp` / `preview` / `latest` / `it` /
`instruct` / `chat`) and ran it against the `nakasyou` set.

Arena-side match rises from 30.0% to **40.7%**. It also produces 29 collision
groups covering 72 of 243 rows, and these newly matched pairs:

```
gemini-exp-1121     -> gemini-exp-1206         different model
ministral-8b-2410   -> ministral-8b-2512       different release
qwen-max-0919       -> qwen-max-2025-01-25     different release
o1-2024-12-17       -> openai/o1-preview       different model, ~30 Elo apart
gpt-4-1106-preview  -> gpt-4                   different model
glm-4-plus          -> glm-4-plus-0111         plausible, unverified
```

Token-overlap fuzzy matching is worse. Jaccard over hyphen-split tokens on the 112
unclassifiable `arena-catalog` rows produces 28 candidates above 0.6, and the
candidates include:

```
0.80  llama-3.1-tulu-3-70b   ->  llama-3-1-70b          (a fine-tune vs the base)
0.75  claude-3-sonnet-20240229 -> claude-3-7-sonnet     (a year and a generation apart)
0.75  qwen2-72b-instruct     ->  qwen2-5-72b-instruct   (different generation)
0.60  gemma-2-9b-it          ->  gemma-2-2b-it          (4.5x parameter difference)
0.60  ring-flash-2.0         ->  gemini-2-0-flash       (different vendor entirely)
```

A recommender that attaches the wrong quality score is worse than one that
attaches none, because `coverage` will report the model as covered. Loosening the
matcher trades a visible gap for an invisible error. I would not ship it.

## 5. Is there an existing crosswalk we could use?

I checked the two named candidates and two others found by search. **None of them
publishes a benchmark-name to catalog-ID mapping.**

### assistant-ui/modelpedia

MIT, 8 stars, pushed today (2026-08-29), actively auto-fetching from provider APIs
via `.github/workflows/fetch-models.yml`. 51 provider directories, 7,952 model
JSON files. Field census across all 7,952:

| Field | Count | What it is |
| --- | --- | --- |
| `created_by` | 7,952 | Originating org, e.g. groq's `llama-3.1-8b-instant` has `created_by: meta` |
| `alias` | 215 | Dated snapshot to stable alias, e.g. `deepseek-reasoner-2025-09-29` to `deepseek-reasoner` |
| `snapshots` | 203 | Stable alias to its dated snapshots (the inverse) |
| `bedrock_id` | 21 | `claude-opus-4-5` to `anthropic.claude-opus-4-5-20251101-v1:0` |
| `vertex_id` | 18 | `claude-opus-4-5` to `claude-opus-4-5@20251101` |
| `successor` | 132 | Deprecation chain |
| `performance` | 231 | A 1-to-5 hand-assigned integer, not a benchmark |

What it does have is genuinely useful for two of our failure modes: `alias` and
`snapshots` solve date-stamp resolution with curated data instead of regex, and
`bedrock_id` / `vertex_id` are real cross-platform crosswalks. What it does not
have: any link from a reseller listing back to a canonical model (groq's Llama
entry carries only `created_by: meta` and `family: llama-3.1`, no target ID), and
no benchmark identifiers of any kind. Adopting it would mean taking a dependency
on a 8-star repo to solve one third of our problem.

### paradite/llm-info

No license file, 7 stars, pushed 2025-12-16. It is a hand-written TypeScript map
of **44 models** in `src/ModelInfoMap.ts`. It carries `openRouterModelId` on 19 of
them (`gpt-4.1` to `openai/gpt-4.1`, `claude-opus-4-5-20251101` to
`anthropic/claude-opus-4-5`) and a `DEPRECATED_MODEL_MAPPINGS` list that records
IDs whose meaning changed under them, such as `deepseek-chat` moving from V3 to
V3.1 on 2025-08-21. That deprecation-drift record is a real insight we do not
have. But 44 models is a rounding error against 3,558, the OpenRouter mapping is
something `deriveOpenRouterId` already approximates, and there are no benchmark
identifiers.

### JonathanChavezTamales/llm-leaderboard (LLM Stats)

356 stars and the closest structural fit: 169 canonical models across 17 orgs,
each with a `benchmarks.json` holding 2,224 rows across 339 distinct benchmarks
(`mmlu`, `gpqa`, `humaneval`, `bfcl`, `arena-hard`, and so on). Its `model_id`
values are the dated API IDs, so 103 / 169 = 60.9% join to models.dev directly.

Two blockers. The README opens with "DEPRECATED, this repository is now
depracated and won't be getting any new updates", last push 2025-10-24. And the
`provider_model_id` field that would have been the crosswalk is **null in all 244
provider rows**. The benchmark scores are also `is_self_reported: true` in the
rows I sampled, which is vendor marketing rather than independent evaluation.

### BerriAI/litellm

`model_prices_and_context_window.json` is the largest and best-maintained ID map
in the ecosystem, but it is keyed by provider-prefixed API IDs and carries pricing
and limits only. No benchmark identifiers.

**Conclusion: no crosswalk exists to adopt.** The only thing in this space that
resembles one is LMArena's own `scatterplot-data.json`, which is 141 rows
maintained by hand by the leaderboard's own team.

## 6. What a reliable join would actually cost

The unavoidable pieces, sized against what the measurements showed is needed:

1. **A normalization ladder** rather than one function. Ordered rules, each one
   tried in turn, first hit wins, so that a match records *how* it matched.
   Roughly 80 to 120 lines, plus tests. This is the cheap part and it takes the
   `arena-catalog` join from 40.8% to somewhere near 55%.

2. **An explicit variant policy.** Something like
   `{ variant: "default" | "max" | "all" }` that decides which of the 16 catalog
   models holding multiple arena ratings gets which number. 40 to 60 lines. This
   is a design decision, not code, and it needs Mark's call before it is written.

3. **Collision detection that refuses rather than guesses.** When N benchmark rows
   normalize to one catalog key, the current `find` picks arbitrarily. Making that
   an explicit, reportable ambiguity is 50 to 80 lines and is the single change
   with the best correctness-per-line ratio. It also fits the existing
   `criterionCoverage` / `onZeroCoverage` vocabulary.

4. **A hand-maintained alias map.** Unavoidable. Nothing derives
   `"GPT-4o" -> chatgpt-4o-latest-20241120`, `mai-1-preview`, `athene-v2-chat`, or
   `early-grok-3`. LMArena maintains 141 by hand for their own scatterplot; AA
   maintains their slugs by hand; llm-info maintains 44 by hand. Sized to the head
   of the leaderboard, the top 60 arena models would need perhaps 25 to 40
   entries. It goes stale on every model launch.

Call it 250 to 350 lines of source plus tests, plus a data file that needs a
human every few weeks. That is a feature, not a detail, and the data file is a
standing maintenance commitment on a zero-dependency library that currently has
none.

## 7. The finding that outranks all of the above

Coverage of the models a user would actually be choosing between, using the best
free source available (arena-catalog, 2025-12-17), restricted to
`DIRECT_PROVIDERS`, non-deprecated, text-to-text:

**19 of 112 = 17.0%.**

Broken out by release month of the catalog model:

```
2024-08   3/3   100%      2025-11   3/3   100%
2024-11   1/5    20%      2025-12   0/4     0%
2025-06   3/5    60%      2026-02   0/6     0%
2025-08   1/6    17%      2026-03   0/10    0%
2025-10   2/4    50%      2026-04   0/11    0%
                          2026-07   0/10    0%
                          2026-08   0/5     0%
```

The 30 most recently released candidate models score **0 / 30**. That includes
`claude-opus-5`, `gpt-5.6`, `gemini-3.7-flash`, `grok-4.6`, `deepseek-v4-pro`.

The models with benchmark coverage are the ones nobody needs a recommender to
find, and the models a recommender exists to surface have none. Perfect identifier
matching would not move this number, because the data is not there to match
against. The binding constraint is that every free LMArena mirror stopped
updating between May and December 2025, and the live leaderboard is behind a 403.

A paid Artificial Analysis key is the only source measured or observed here that
plausibly tracks current models, and its join rate remains unmeasured for want of
a key.

## Appendix: reproducing these numbers

```
curl -sS -o modelsdev.json https://models.dev/api.json
curl -sSL -o arena-leaderboard-text.json \
  https://raw.githubusercontent.com/lmarena/arena-catalog/main/data/leaderboard-text.json
curl -sSL -o arena-scatter.json \
  https://raw.githubusercontent.com/lmarena/arena-catalog/main/data/scatterplot-data.json
curl -sS -o lmarena.json \
  https://raw.githubusercontent.com/nakasyou/lmarena-history/main/output/scores.json
```

Join rates were computed by reimplementing `normalizeModelId` from `src/id.ts`
verbatim in a standalone script. No project files were modified and no build or
test run was performed.

---

# Addendum: sources measured after initial report

Measured 2026-08-29, same method and same candidate population as sections 1 to 7
above, so every number here is directly comparable. Two sources surfaced after
the initial report. **Both exist, both are live, and together they overturn the
verdict in section 7.** Nothing in sections 1 to 6 is retracted.

## A1. `lmarena-ai/leaderboard-dataset` on Hugging Face

**It exists and it is current.** Created 2026-04-02, last modified
**2026-08-28**, CC-BY-4.0, 26,456 downloads, 23 likes. It is a different artifact
from both mirrors tested in section 2. It supersedes them.

```
total rows          2,251,197   across 22 configs / 44 splits
text                1,104,150   text_style_control  962,560
vision                 44,699   webdev               19,169
agent                     908   (Agent Arena, data starts 2026-06-04)
```

Configs cover `text`, `vision`, `search`, `document`, `webdev`, four
image and video arenas, and `agent` with five per-signal subsets
(`agent_tool_hallucination`, `agent_steerability`, `agent_bash_recovery_steps`,
`agent_praise_complaint`, `agent_task_outcome_explicit`). Schema is
`model_name`, `organization`, `license`, `rating`, `rating_lower`,
`rating_upper`, `variance`, `vote_count`, `rank`, `category`,
`leaderboard_publish_date`. Splits are `full` (all history) and `latest`.

**The ratings are moving, not a fresh wrapper on stale numbers.**
`text/latest` where `category='overall'` returns 395 models, all carrying
`leaderboard_publish_date` **2026-08-27**, two days before measurement, totalling
11,542,442 votes. Tracking one model through the `full` split, `claude-opus-5-high`
appears in 12 published leaderboards:

```
2026-07-26  07-27  07-30  08-02  08-03  08-06  08-10  08-11  08-12  08-19  08-21  08-27
```

That is a new leaderboard every two to four days. The head of the table is
`claude-opus-5-max` (1505), `claude-opus-5-high` (1504), `claude-opus-4-6-high`
(1503), against `claude-opus-5` released 2026-07-24. The newest models are rated
within weeks of release.

This also explains the 403 from section 2: LMArena rebranded to **arena.ai**, and
the dataset README points at `https://arena.ai/leaderboard`. I was probing a
retired hostname.

### Coverage, same population as before

Candidate population is unchanged: `DIRECT_PROVIDERS`, not deprecated,
text-to-text, **112 models**.

| Join | Candidates | 30 newest | Arena side |
| --- | --- | --- | --- |
| `matchesModel`, arena name as-is | **35/112 = 31.3%** | 8/30 | 176/395 = 44.6% |
| after folding reasoning-effort suffixes | **46/112 = 41.1%** | **14/30** | 203/395 = 51.4% |

Compare the section 7 figure of 19/112 and **0/30**.

Whole catalog after folding: 2,980 / 7,488 entries = 39.8%, and 185 / 2,226
distinct normalized IDs.

### What "folding" means, and what it costs

The dominant naming convention on arena.ai is now the reasoning-effort suffix,
not the date stamp. `claude-opus-5-max`, `claude-opus-5-high`,
`gemini-3.7-flash-high`, `gemini-3.5-flash-medium`, `gpt-5.5-high`,
`muse-spark-1.2 (xHigh)`. Stripping a trailing `-max` / `-high` / `-medium` /
`-low` / `-thinking` / `-no-thinking` and a parenthesised `(xHigh)` adds 11
candidates and 6 of the 30 newest. It is about 6 lines of regex.

It also creates the exact ambiguity flagged in section 3, and now it is the
common case rather than the edge case. Nine candidate models end up holding two
or more arena ratings:

```
openai/gpt-5.1              gpt-5.1-high / gpt-5.1                     Elo spread 19
openai/gpt-5.4              gpt-5.4-high / gpt-5.4                     Elo spread 17
anthropic/claude-opus-4-8   claude-opus-4-8-high / claude-opus-4-8     Elo spread  9
google/gemini-3.5-flash     gemini-3.5-flash-high / -medium            Elo spread  8
anthropic/claude-opus-5     claude-opus-5-max / claude-opus-5-high     Elo spread  1
```

Which of the two a `recommend()` call sees is a product decision. It is not
recoverable from the strings.

### Remaining failure modes, 192 unmatched arena rows

Four now contain **whitespace or parentheses**, which `normalizeModelId` does not
touch at all: `gemini-3-flash (thinking-minimal)`, `mimo-v2-flash (thinking)`,
`mimo-v2-flash (non-thinking)`, `Inkling Small`. Note the capital letters in the
last one; the arena `model_name` column is no longer reliably an API-shaped slug.

The rest are the same categories as section 3, with the same proportions:
arena-only experimentals (`muse-spark`, `muse-glimmer`,
`amazon-nova-experimental-chat-26-02-10`, `grok-4.20-beta1`), effort plus
thinking-budget combinations (`claude-opus-4-5-20251101-high-32k`,
`deepseek-v4-pro-high-preview`), historical dated IDs (`o3-2025-04-16`,
`gpt-4.1-2025-04-14`), and models simply absent from models.dev
(`qwen3.8-max`, `kimi-k2.5-instant`, `hunyuan-hy3-preview`).

## A2. OpenRouter `/api/v1/models`

**Confirmed live and keyless.** HTTP 200, 655,424 bytes, no header sent.

```
396  models returned
165  with a non-empty benchmarks.artificial_analysis   (matches the reported figure)
152  with a non-empty benchmarks.design_arena          (matches the reported figure)
123  distinct base slugs with AA, after collapsing :batch and :free variants
```

All 165 carry all three AA sub-fields: `intelligence_index`, `coding_index`,
`agentic_index`. `design_arena` is an array of per-category objects with `arena`,
`category`, `elo`, `win_rate`, `rank`. Verbatim from the response:

```json
"id": "z-ai/glm-5.3-flash",
"canonical_slug": "z-ai/glm-5.3-flash-20260826",
"benchmarks": {
  "design_arena": [],
  "artificial_analysis": { "intelligence_index": 57.5, "coding_index": 71.5, "agentic_index": 58.2 }
}
```

**The AA scores are current, not a stale snapshot.** `z-ai/glm-5.3-flash` was
listed 2026-08-26 and already carries indices, three days before measurement. AA
coverage by the month a model was listed on OpenRouter:

```
2026-03  14/22 64%    2026-06  13/21 62%
2026-04  24/39 62%    2026-07  23/39 59%
2026-05  10/16 63%    2026-08  16/33 48%
```

Coverage holds at roughly 60% right up to the present month. A stale dump would
decay to zero.

### Coverage, same population as before

| Join | Candidates | 30 newest |
| --- | --- | --- |
| `matchesModel` vs any OR slug | 65/112 = 58.0% | n/a |
| `matchesModel` vs an OR slug carrying AA | **38/112 = 33.9%** | **18/30** |
| exact `openRouterId` vs any OR slug | 54/112 = 48.2% | n/a |
| exact `openRouterId` vs an OR slug carrying AA | 30/112 = 26.8% | 14/30 |

Whole catalog: 2,887 / 7,488 entries = 38.6% via `matchesModel`.

### The join quality here is the real story

**Zero orphans and zero collisions.** All 123 AA-carrying OpenRouter slugs find a
models.dev home under `matchesModel`, and not one candidate model matches more
than one distinct AA row. Compare LMArena, where 192 of 395 rows have no catalog
counterpart and 9 candidates match multiple rows.

That is not luck. OpenRouter and models.dev are both catalogs of *callable API
endpoints*, so they name the same things. LMArena is a catalog of *rated
configurations*, which is a different population. Every failure mode in sections
3 and 4 traces back to that mismatch. Joining catalog to catalog largely
dissolves it.

### Does `openRouterId` make the join trivial? No.

This was the specific question, and the measurement says the opposite of what
you would expect: `matchesModel` **beats** the function written for the purpose,
58.0% against 48.2%. `deriveOpenRouterId` has two defects.

**It does not know OpenRouter's provider namespace.** OpenRouter uses
`mistralai/` and `x-ai/`, models.dev uses `mistral` and `xai`:

```
provider    catalog entries    derived slug exists on OR    OR slugs with that prefix
mistral            34                   0                            0
xai                12                   0                            0
cohere             14                   3                            5
google             39                  22                           28
openai             47                  34                           58
anthropic          13                  10                           17
deepseek            3                   3                           14
```

Zero of 46 Mistral and xAI catalog entries produce a usable slug. OpenRouter also
carries 39 provider prefixes that are not models.dev provider IDs, including a
tilde namespace (`~anthropic/`, `~openai/`, `~x-ai/`) that the derivation never
produces.

**It emits malformed slugs for dated Anthropic IDs.** The regex
`(?<=-\d+)(-\d+)$` in `src/id.ts:196` cannot tell a version segment from a date
stamp, so it converts the wrong hyphen. 3 of 13 anthropic entries are affected:

```
claude-sonnet-4-5-20250929  ->  anthropic/claude-sonnet-4-5.20250929   (real slug: anthropic/claude-sonnet-4.5)
claude-haiku-4-5-20251001   ->  anthropic/claude-haiku-4-5.20251001    (real slug: anthropic/claude-haiku-4.5)
claude-opus-4-5-20251101    ->  anthropic/claude-opus-4-5.20251101     (real slug: anthropic/claude-opus-4.5)
```

This is a live bug in shipped code, independent of the benchmark question. It is
worth a separate issue.

Fixing both defects (a provider-alias table of roughly 6 entries, and stripping
the date before the version rewrite) would put exact `openRouterId` matching
ahead of `matchesModel` and give a join with a verifiable ground truth, since
OpenRouter's slug is a real identifier rather than a normalized guess. That is
maybe 30 lines. **This is the cheapest correct join available.**

### Also found: OpenRouter runs its own benchmarks

`openrouter.ai/benchmarks` reports 6 benchmarks and **2,459,423 task evaluations,
last run Aug 30, 2026**: `browsecomp`, `deepsearchqa`, `gpqa-diamond`, `hle`,
`tau2-bench-airline`, `widesearch`, with 119 to 120 models each. This is
OpenRouter's own measurement, not redistributed AA data.

It is **not** keyless. `GET /api/v1/benchmarks` returns
`{"error":{"message":"No cookie auth credentials found","code":401}}`, and the
documented call is `--header 'Authorization: Bearer <token>'`. Out of scope for a
zero-config adapter, but relevant if pickai ever accepts an optional key, because
`tau2-bench-airline` is a closer match to the `agent-workload.ts` example's
intent than anything AA exposes on the free tier.

## A3. Terms and licensing, quoted not interpreted

I am recording what the documents say. I am not offering a view on what they mean
for pickai.

### OpenRouter Terms of Service

Source: https://openrouter.ai/terms, "Last Updated: July 29, 2026". Section 7,
"Prohibited Conduct", "BY USING THE SERVICE, YOU AGREE NOT TO:". The two clauses
that bear on reuse of `/api/v1/models`, quoted in full:

> access the Site or Service for purposes of reselling API access to Models or
> otherwise developing a competing service;

> develop, support or use software, devices, scripts, robots or any other means
> or processes (such as crawlers, browser plugins, add-ons or any other automated
> technology) to scrape or copy any information on the Site or the Services;

And immediately following:

> bypass any technical measures implemented by OpenRouter that are designed to
> prevent scraping;

Section 20 note: "Model Providers are intended third-party beneficiaries of
Sections 5, 6.1, 15, 17, and this Section 20".

**On attribution:** the strings "Artificial Analysis" and "attribution" do not
appear anywhere in the Terms of Service (52,037 characters of extracted text,
searched case-insensitively). The `/api/v1/models` response carries no license,
attribution, or source field alongside `benchmarks.artificial_analysis`. The
public benchmarks page at https://openrouter.ai/benchmarks likewise does not
mention Artificial Analysis. I found **no** stated attribution requirement, and
equally no stated permission.

Two facts worth separating for whoever decides this. `/api/v1/models` is a
documented public API endpoint that serves this data without a key, which is not
the same act as crawling the Site. And the prohibition on "developing a competing
service" is aimed at reselling model inference, which pickai does not do. Both
readings are available on the text quoted above. That is the decision, and it is
not mine.

### LMArena / arena.ai dataset

`lmarena-ai/leaderboard-dataset` is tagged **`license:cc-by-4.0`** in its
Hugging Face metadata. CC-BY-4.0 permits commercial redistribution and
derivative works with attribution to the licensor. The dataset card contains no
citation block, so the attribution string would need to be agreed with LMArena or
composed from the card's own link, https://arena.ai/leaderboard.

This is the only one of the five sources examined across this whole report that
carries an explicit, permissive, machine-readable license.

## A4. Combined coverage, and the revised verdict

Union of the two sources on the same 112 candidates:

```
OpenRouter AA only          38/112
LMArena (folded) only       46/112
either                      56/112 = 50.0%
both                        28/112

30 most recently released:  either 18/30      both 14/30
```

**I am changing the verdict in section 7.** Two specific measurements changed my
mind, and neither is about identifier matching:

1. **0/30 became 18/30.** The claim in section 7 was that the models a
   recommender exists to surface have no benchmark data at all. That was true of
   every source I had tested and it is false of these two. `claude-opus-5`,
   `gpt-5.6-luna`, `gemini-3.7-flash`, `grok-4.6`, and `deepseek-v4-pro` all
   carry a current quality signal.

2. **Both sources are demonstrably live.** LMArena publishes every two to four
   days under CC-BY-4.0. OpenRouter had AA indices on a model listed three days
   before measurement. My section 7 conclusion rested on every free mirror
   having frozen between May and December 2025. That premise is now simply wrong,
   and it was wrong because I searched GitHub mirrors and a retired hostname
   rather than the vendors' current distribution channels.

**What has not changed.** Everything in sections 3 through 6 stands. The join is
still not free: `matchesModel` alone gets 31.3% against LMArena, and the effort
suffix folding that lifts it to 41.1% creates a real ambiguity on 9 of the most
important models, with Elo spreads up to 19 points. No crosswalk exists to
adopt. A hand-maintained alias map is still needed for anything beyond the head
of the leaderboard. My warning against fuzzy matching stands unchanged and
matters more now, because there is finally data worth matching wrongly.

The revised shape of the problem is that **the two sources are not
interchangeable and should not be joined the same way.** OpenRouter is a catalog
of API endpoints like models.dev, so it joins cleanly (zero orphans, zero
collisions) and its residual problems are provider-namespace bugs in our own
`deriveOpenRouterId`, fixable in about 30 lines. LMArena is a catalog of rated
configurations, so it needs the variant policy from section 6 item 2, and that
policy is a product decision, not a code problem.

The genuine open risk is no longer freshness or matching. It is A3: OpenRouter's
terms contain a broad anti-scraping clause with no carve-out for their public
API and no attribution statement for the Artificial Analysis data they
redistribute. The LMArena dataset has no such ambiguity, being explicitly
CC-BY-4.0. If only one source can be shipped, that asymmetry, rather than any
coverage number, is the reason to prefer LMArena.
