# Free, machine-readable AI model quality data sources

Research date: 2026-08-30. Question: which benchmark/quality data sources could pickai ship as a
built-in adapter without asking its users to pay, register, or hold a key?

Method: every endpoint below was probed with `curl` from this machine on 2026-08-30 unless the entry
says otherwise. HTTP status codes and row counts quoted here are observed, not inferred from
documentation. Where a claim comes from a page rather than a probe, the link points at the page.

## Bar the winner has to clear

pickai is zero-dependency TypeScript. That rules out, or heavily discounts, any source that requires
a ZIP reader, a Parquet reader, or a YAML parser to consume. It also rules out anything where the
end user must create an account. The realistic shape of a built-in adapter is: one or a few `fetch`
calls returning JSON or CSV, joined to models.dev IDs.

---

## 1. LMArena official HuggingFace dataset: `lmarena-ai/leaderboard-dataset`

**This is the strongest candidate and it is not what the existing pickai example uses.**

**Endpoint.** [`https://huggingface.co/datasets/lmarena-ai/leaderboard-dataset`](https://huggingface.co/datasets/lmarena-ai/leaderboard-dataset),
read as JSON through the HuggingFace dataset-viewer REST API:

```
https://datasets-server.huggingface.co/rows?dataset=lmarena-ai%2Fleaderboard-dataset&config=text&split=latest&offset=0&length=100
```

Verified: `200`, JSON, first row `claude-opus-5-max` / `organization: anthropic` / `rating:
1504.75` / `rank: 1` / `leaderboard_publish_date: 2026-08-27`.

**Access mechanics.** No key, no registration, no scraping. The dataset-viewer API states plainly
"There is no installation or setup required to use the dataset viewer API" and that a token is only
needed for *gated* datasets ([HF dataset-viewer quickstart](https://huggingface.co/docs/dataset-viewer/en/quick_start)).
The dataset's own metadata reports `gated: false`. The `/rows` endpoint caps `length` at 100, so the
395 rows of the `overall` category take 4 requests. A `/filter` endpoint exists
(`where="category"='overall'`) but returned `{"error":"the dataset index is loading"}` on a cold
call, so an adapter should not depend on it. I could **not** find a documented anonymous rate limit
for `datasets-server.huggingface.co`; treat that as unverified.

The underlying files are Parquet, which pickai cannot read with zero dependencies. The dataset-viewer
`/rows` JSON API is what makes this viable.

**License.** `cc-by-4.0`, declared in the dataset card front matter and in the Hub tag list
(`license:cc-by-4.0`). Redistribution is explicitly permitted with attribution.

**What it measures.** Crowdsourced blind pairwise human preference, Bradley-Terry ratings (Elo until
2024-01-09, per the [dataset card](https://huggingface.co/datasets/lmarena-ai/leaderboard-dataset)).
Subsets: `text`, `text_style_control`, `vision`, `search`, `document`, `webdev` (Code Arena),
`text_to_image`, `image_edit`, `text_to_video`, `image_to_video`, `video_edit`, and `agent` (Agent
Arena, live since 2026-06-04) with five per-signal agent subsets. Each subset has a `latest` split
and a `full` historical split. Style control has been the text/vision default since 2025-05-16.

**Cadence and maintenance.** Alive and near-daily. Commit log shows 14 subset updates dated
2026-08-28 for publish date 2026-08-27, and `webdev` updated 2026-08-26 for 2026-08-25. Dataset
`lastModified` 2026-08-28. 26,456 downloads, the highest of any leaderboard dataset I found on the
Hub.

**Coverage.** `text`/`latest` has 10,424 rows across categories; the `overall` category alone has
**395 distinct models**, including open-weight ones (rows carry a `license` column, and organizations
include Alibaba, DeepSeek, Z.ai, Moonshot, NVIDIA, Meta). `webdev`/`latest` has 499 rows.

**Joinability to models.dev.** Medium, and measurable. Naive case-and-punctuation-insensitive match
of `model_name` against the 3,558 distinct model IDs in
[models.dev/api.json](https://models.dev/api.json): **148/395 = 37%**. Adding three normalization
rules (strip trailing reasoning-effort suffixes `-high|-max|-xhigh|-medium|-low|-minimal`, strip
`(...)` parentheticals, strip trailing `YYYYMMDD` date stamps and `-32k` context markers): **193/395
= 49%**. The residual misses are overwhelmingly things that have no models.dev counterpart at all:
arena codenames (`muse-spark`, `Inkling Small`, `dola-seed-2.0-pro`), preview snapshots
(`qwen3.7-max-preview`), thinking/no-thinking variants, and retired models. For currently-shipping
named models the effective join rate is well above 49%. The `organization` column gives a second
join key against the models.dev provider.

**Caveat.** The arena has rebranded: `lmarena.ai` now `301`s to `arena.ai`, and `arena.ai/api/leaderboard`
returns `403 {"error":"Route not allowed"}`. There is no public site API. The HF dataset is the
sanctioned machine-readable channel.

### Finding: pickai's existing LMArena example is fetching dead data

`examples/lmarena-benchmarks.ts` fetches
[`nakasyou/lmarena-history`](https://github.com/nakasyou/lmarena-history). That repo's last commit is
**2025-05-23** ([commit list](https://api.github.com/repos/nakasyou/lmarena-history/commits)), and
the newest date key inside `output/scores.json` is `20250522`, 15 months stale, 243 models, top
model `gemini-2.5-pro-preview-05-06`. It is a one-star personal mirror (MIT) that re-derived scores
from `.pkl` files in the [`lmarena-ai/arena-leaderboard` HF Space](https://huggingface.co/spaces/lmarena-ai/arena-leaderboard),
whose newest `elo_results_*.pkl` predates the rebrand. The example still runs; it just silently
returns 2025 rankings. This should be switched to the official dataset regardless of what the
built-in adapter ends up being.

A second, live third-party mirror exists:
[`oolong-tea-2026/arena-ai-leaderboards`](https://github.com/oolong-tea-2026/arena-ai-leaderboards),
MIT, daily GitHub Actions snapshots as plain JSON, last commit 2026-08-26, 31 stars. But it is one
person scraping `arena.ai`, its README asserts "Arena AI doesn't provide a public API" (which the HF
dataset contradicts), and it is exactly the failure mode `nakasyou/lmarena-history` already
demonstrated. Not recommended as a dependency.

---

## 2. Epoch AI Benchmarking Hub

**Endpoint.** [`https://epoch.ai/data/benchmark_data.zip`](https://epoch.ai/data/benchmark_data.zip).
Verified `200`, 473,917 bytes, `application/zip`, internal file timestamps `2026-08-30 04:16`
(regenerated the day of this research).

**Access mechanics.** No key, no registration. **ZIP only.** The
[use-this-data page](https://epoch.ai/benchmarks/use-this-data) offers exactly two channels: the CSV
ZIP download, or `pip install epochai`, a Python client that reads Epoch's Airtable. I probed
`https://epoch.ai/data/epoch_capabilities_index.csv`, `/data/benchmark_data/…`, `/data/benchmarks/…`
and `/benchmarks/data/…`: all `404`. There is no per-file CSV or JSON URL. For zero-dependency
TypeScript this is close to disqualifying: a ZIP reader is a dependency.

**License.** The clearest of any source here. The README inside the ZIP and the use-this-data page
both say: "Epoch AI's data is free to use, distribute, and reproduce provided the source and authors
are credited under the [Creative Commons Attribution license](https://creativecommons.org/licenses/by/4.0/)."
The page also flags that Aider Polyglot and Terminal-Bench derived data retain Apache-2.0.

**What it measures.** 76 CSV files. Epoch's own runs (`gpqa_diamond.csv`, `math_level_5.csv`,
`swe_bench_verified.csv`, `frontiermath.csv`, `simpleqa_verified.csv`, `otis_mock_aime`,
`chess_puzzles`, `mirrorcode`) plus ~60 `*_external.csv` mirrors of other people's leaderboards
(`aider_polyglot_external`, `terminalbench_external`, `live_bench_external`, `simplebench_external`,
`arc_agi_external`, `arc_agi_2_external`, `hle_external`, `metr_time_horizons_external`,
`webdev_arena_external`, `osworld_2_external`, `gdpval_external`, `mmlu_external`, and more).

The single most interesting file for pickai is **`epoch_capabilities_index.csv`**, the Epoch
Capabilities Index, one composite quality number per model, which is precisely the "one quality
signal" shape pickai wants. Columns: `Model version, ECI Score, Release date, Organization, Country,
Model accessibility, Training compute (FLOP), Confidence, Model name, Description, Display name`.

**Cadence and maintenance.** Actively maintained; the ZIP is rebuilt at least daily (files stamped
today). Individual benchmark rows carry `Started at` timestamps as recent as `2026-08-28`.

**Coverage.** ECI has 867 rows, 572 with a score, collapsing to ~389 unique models once
reasoning-effort suffixes (`_none`, `_high`, `_xhigh`, `_32K`) are stripped. `Model accessibility`
breaks down as 228 API-access, 82 open-weights-unrestricted, 58 open-weights-restricted, 11
open-weights-non-commercial, 2 hosted-no-API, 2 unreleased. That open-weight coverage is better than
most sources here, and the accessibility column is itself a useful signal pickai does not currently
have.

**Joinability.** Comparable to LMArena. With effort-suffix and date-stamp stripping: **151/324 = 47%**
against models.dev. Residual misses are dominated by retired models (`gpt-4-0613`, `claude-2.1`,
`Llama-2-70b-chat-hf`, `gemini-1.5-pro-001`) that models.dev no longer lists, plus vendor-prefixed
rows (`fireworks/kimi-k2p5`) and pre-release codenames.

**Verdict.** Best license, best composite metric, best open-weight coverage, worst packaging. Worth
raising with the maintainer whether a ZIP is acceptable, or whether pickai should ask Epoch for a
stable per-file CSV URL.

---

## 3. Artificial Analysis (free tier)

**Endpoint.** `https://artificialanalysis.ai/api/v2/data/llms/models`. Verified `401` without a
key, 31-byte error body.

**Access mechanics.** Free, but **the user must create an account and generate a key**. From the
[API reference](https://artificialanalysis.ai/documentation): "To access our free API, create an
account for the Artificial Analysis Insights Platform and generate an API key." Key goes in the
`x-api-key` header. "The API is rate-limited to 1,000 requests per day. To avoid publicly sharing
keys and rate limits, please do not include in client side code and cache responses."

**License.** No open license. "Attribution is required for all use of our free API… Use of the API
is subject to our Terms of Use and Data Platform Terms." Redistribution of the data is not granted;
this is permission to *call the API*, not to republish.

**What it measures.** An intelligence index compositing independent re-runs of standardized
benchmarks, plus speed (median output tokens/sec), time-to-first-token, and pricing.

**Verdict.** Disqualified on the stated requirement. It is free-as-in-price but not free-as-in-no-user-action,
and the client-side prohibition rules out any browser use of pickai with this adapter. Keep it as the
opt-in example it already is (`examples/aa-benchmarks.ts`).

---

## 4. OpenRouter public rankings

**Endpoints.** All verified without any key:

| URL | Status | Size |
| --- | --- | --- |
| `https://openrouter.ai/api/v1/models` | 200 | 655 KB, 396 models |
| `https://openrouter.ai/api/frontend/v1/rankings/models` | 200 | 333 KB, 582 rows |
| `https://openrouter.ai/api/frontend/v1/rankings/tools` | 200 | 5.5 KB |
| `https://openrouter.ai/api/frontend/v1/rankings/apps` | 200 | 28 KB |

**Access mechanics.** No key. But `/api/frontend/` is an **undocumented internal endpoint** that the
[rankings page](https://openrouter.ai/rankings) calls; it is not in OpenRouter's published API docs
and carries no stability promise. `/api/v1/models` is documented and stable but carries no quality
data.

**License.** None stated that I could find. Unverified.

**What it measures.** **Usage, not quality.** Rows are `{date, model_permaslug, variant,
total_completion_tokens, total_prompt_tokens, count, total_tool_calls,
requests_with_tool_call_errors, …}`. This is a popularity/market-share signal. `total_tool_calls` and
`requests_with_tool_call_errors` are the only quality-adjacent fields, and a tool-call error *rate*
derived from them would be an interesting, genuinely novel signal, but it is a signal nobody else
publishes and pickai would be inventing the methodology.

**Cadence.** Daily; newest row observed `2026-08-29`.

**Coverage.** 484 distinct `model_permaslug` values.

**Joinability.** The best of any source, because models.dev already has an `openrouter` provider with
354 models keyed by OpenRouter slugs. Stripping the trailing `-YYYYMMDD` from `model_permaslug`
matches **262/484 = 54%**, and essentially all the misses are embedding, rerank, TTS, STT and image
models that models.dev's OpenRouter entry does not list (`cohere/rerank-4-pro`,
`text-embedding-3-small`, `openai/whisper-large-v3-turbo`). For chat models the join is close to
exact.

**Verdict.** Great join, wrong axis. Popularity is not quality. Worth considering as a *second*,
complementary signal later, not as the one quality adapter.

---

## 5. LiveBench

**Endpoints.** The site is a React SPA. From the deobfuscated bundle
(`https://livebench.ai/static/js/main.a37007ad.js`) it fetches three files per release, with dashes
replaced by underscores:

```
./table_${release}.csv     ./categories_${release}.json     ./cost_${release}.csv
```

Verified: `https://livebench.ai/table_2026_06_25.csv` → `200`, 8,269 bytes, 48 data rows, header
`model,AMPS_Hard,code_completion,code_generation,connections,…,zebra_puzzle` (23 task columns).
`table_2026_07_22.csv` (the newest release listed in the bundle), `table_2026_05_19.csv` and
`table_2026_04_23.csv` all returned `404`, and `categories_2026_07_22.json` returned `404`. So only
one release is actually fetchable at a time and the URL is undocumented, unversioned and unstable.

**Access mechanics.** No key. Effectively scraping a build artifact.

**License.** The benchmark repo [`LiveBench/LiveBench`](https://github.com/LiveBench/LiveBench) is
Apache-2.0 (inherited from FastChat; GitHub reports `NOASSERTION` because of the embedded upstream
notice). The **website repo** [`LiveBench/livebench.github.io`](https://github.com/LiveBench/livebench.github.io)
has **no license at all**, and the leaderboard CSVs live there. Redistributing the scores is legally
murky.

**Maintenance.** The benchmark itself is alive: `LiveBench/LiveBench` last pushed 2026-08-29, with
commits that day. But the current site repo was last pushed 2026-07-09, and there is a
`LiveBench/new-livebench` repo described as "Redesigned LiveBench leaderboard (private preview) —
deploys to new-livebench.ai" last pushed 2026-08-29. A URL migration is in flight.

**What it measures.** Contamination-free monthly-refreshed tasks across math, coding, reasoning,
language, data analysis, instruction following, with objective ground-truth scoring.

**Coverage.** 48 models in the fetchable table. Thin, and skewed to frontier models with
effort-variant naming (`claude-opus-4-5-20251101-thinking-64k-high-effort`).

**Verdict.** Good benchmark, bad plumbing. An adapter would break at the next site redesign, and the
scores are unlicensed.

---

## 6. Aider polyglot leaderboard

**Endpoint.**
[`https://raw.githubusercontent.com/Aider-AI/aider/main/aider/website/_data/polyglot_leaderboard.yml`](https://raw.githubusercontent.com/Aider-AI/aider/main/aider/website/_data/polyglot_leaderboard.yml).
Verified `200`, 45,725 bytes, 69 entries.

**Access mechanics.** No key, plain raw-GitHub fetch. But it is **YAML**, which pickai cannot parse
without a dependency.

**License.** [`Aider-AI/aider`](https://github.com/Aider-AI/aider) is Apache-2.0. Epoch AI
independently confirms this on its [use-this-data page](https://epoch.ai/benchmarks/use-this-data):
"Data derived from the Aider Polyglot leaderboard is licensed under the Apache License 2.0." Clean.

**Maintenance: effectively frozen.** The repo was last pushed 2026-05-22, but the leaderboard file
itself was last touched **2025-10-04** ("chore: update deepseek model names and metadata"). Eleven
months without a new model.

**Coverage.** 69 entries. Model field is a human display name (`Gemini 2.0 Pro exp-02-05`), so the
join to models.dev is a hard fuzzy-matching problem, not a normalization problem.

**Verdict.** Dead data, wrong format, hard join. Good license is not enough.

---

## 7. Terminal-Bench

**Endpoint.** [`https://www.tbench.ai/leaderboard`](https://www.tbench.ai/leaderboard) returns
`200`, but it is a Next.js page with no discoverable JSON route (`/api/leaderboard` → `404`; `api.tbench.ai` does not
resolve).

**License and maintenance.** [`harbor-framework/terminal-bench`](https://github.com/harbor-framework/terminal-bench)
is Apache-2.0 and was pushed 2026-08-30, very much alive. Epoch confirms the leaderboard data is
Apache-2.0.

**Practical route.** Epoch AI already redistributes it as `terminalbench_external.csv` (59,629 bytes)
inside `benchmark_data.zip`, which is a cleaner path than scraping the site.

**Joinability problem.** Terminal-Bench entries are *agent + model* pairs, not bare models. The same
model scores differently under different scaffolds, so a row does not map one-to-one onto a
models.dev model. Same structural issue as SWE-bench.

---

## 8. SWE-rebench (Nebius)

Worth recording because the name is misleading. [`nebius/SWE-rebench-leaderboard`](https://huggingface.co/datasets/nebius/SWE-rebench-leaderboard)
is CC-BY-4.0, 8,654 downloads, `lastModified` 2026-07-28, but I pulled rows from it and the columns
are `repo, instance_id, base_commit, patch, test_patch, problem_statement, FAIL_TO_PASS, …`. It is
the **task instance set, not model scores**. The newest split is `2026_03` (110 rows). The actual
leaderboard lives on swe-rebench.com, which I did not verify as machine-readable.

---

## 9. Community aggregators (low trust)

- [`oolong-tea-2026/arena-ai-leaderboards`](https://github.com/oolong-tea-2026/arena-ai-leaderboards):
  MIT, daily JSON snapshots of every Arena leaderboard, last commit 2026-08-26, 31 stars, plus an
  unofficial REST mirror at `api.wulong.dev`. Superseded by the official HF dataset.
- [benchlm.ai](https://benchlm.ai/data): an ad-supported SEO aggregator advertising CSV/JSON
  downloads and embeddable widgets. I could not locate a license statement on the data page.
  Provenance and longevity are both unestablished. Not recommended.


---

## 10. Berkeley Function Calling Leaderboard (BFCL)

**Endpoint.** [`https://gorilla.cs.berkeley.edu/data_overall.csv`](https://gorilla.cs.berkeley.edu/data_overall.csv).
Verified `200`, 33,046 bytes, `text/csv`. Discovered from
[`index_main.js`](https://gorilla.cs.berkeley.edu/index_main.js), which builds
`./data_${datasetName}.csv` and calls `init("overall")`. Header is 36 columns:
`Rank, Overall Acc, Model, Model Link, Total Cost ($), Latency Mean (s), ..., Non-Live AST Acc,
Live Acc, Multi Turn Acc, Web Search Acc, Memory Acc, Relevance Detection, Irrelevance Detection,
Organization, License`. Row 1 verified as `Claude-Opus-4-5-20251101 (FC), 77.47%`.

**Access mechanics.** One small static CSV, no key, no registration, no scraping. This is the
lowest-friction fetch of every source in this document. Per-category files presumably follow the same
`data_<name>.csv` pattern; only `overall` was verified. CORS behaviour and rate limits unverified.

**License.** [`ShishirPatil/gorilla`](https://github.com/ShishirPatil/gorilla) is Apache-2.0. The CSV
is served from the Berkeley web host with no separate license statement, so whether the CSV inherits
Apache-2.0 is **unverified**. The raw score archive
[`HuanzhiMao/BFCL-Result`](https://github.com/HuanzhiMao/BFCL-Result) has no license and was last
pushed 2025-12-17.

**What it measures.** Function/tool calling accuracy: AST correctness on non-live and live prompts,
multi-turn, web search, memory, plus relevance and irrelevance detection. That is a narrower axis
than general intelligence, but it maps directly onto agent workloads, which is the use case pickai's
`agent-workload.ts` example already targets.

**Cadence.** V4, "Last Updated: 2026-04-12" on the leaderboard page; gorilla repo pushed 2026-04-13.
Roughly four and a half months stale as of this research. Slow, not abandoned.

**Coverage.** 109 rows, 109 distinct models, with the best open/commercial balance of any source
here. By the CSV's own `License` column: 44 Proprietary, 26 Apache-2.0, 9 CC-BY-NC-4.0, 6 Meta Llama
3 Community, 4 MIT, 4 Gemma, 4 Falcon. By org: OpenAI 16, Qwen 15, Google 10, Mistral 9, Anthropic
6, Meta 6, Salesforce 5.

**Joinability.** Stripping the trailing parenthetical and case-folding matches **44/109** against
models.dev. The parenthetical is not decoration: `(FC)` and `(Prompt)` are two evaluation modes of
the same model with different scores, so one models.dev model can map to several rows and the adapter
needs a policy. Names also collide after stripping (`Gemini-3-Pro-Preview` appears twice).

---

## 11. Vals AI

**Endpoint.** No API. [`https://www.vals.ai/api/benchmarks`](https://www.vals.ai/api/benchmarks),
`/benchmarks/gpqa.json` and `/data/gpqa.json` all `404`; `api.vals.ai` does not resolve. The site is
Astro, and scores live as HTML-escaped JSON inside an `<astro-island props="...">` attribute.
[`https://www.vals.ai/benchmarks/gpqa`](https://www.vals.ai/benchmarks/gpqa) verified `200`, 746,601
bytes; the props parse to `{metadata: {benchmark, slug, benchmark_id, version, updated, tasks,
models}, tasks: {...}}`.

**Access mechanics.** Scraping only, one ~750 KB page per benchmark, recoverable with an HTML unescape
plus `JSON.parse`. Parsing a framework-internal element attribute will break silently on any site
rebuild.

**License and terms.** None found, and their absence is itself the finding.
[robots.txt](https://www.vals.ai/robots.txt) is `Allow: /` with no disallows, `https://www.vals.ai/terms`
is `404`, and the [sitemap](https://www.vals.ai/sitemap.xml) (245 URLs) has no terms, privacy, or
legal page. No prohibition is not a grant.

**What it measures.** 40+ independently-run benchmarks: GPQA, MMLU-Pro, MMMU, SWE-bench,
Terminal-Bench 2.1, LiveCodeBench, AIME, MATH-500, plus domain sets (LegalBench, MedQA, corporate
finance, tax, mortgage). Per-model metrics are `{accuracy, latency, cost_per_test, avg_input_tokens,
avg_output_tokens, harness}`. Vals runs its own evals rather than reprinting vendor claims and
annotates the caveats: the GPQA page notes Claude Fable 5's published 93.18% "counts refusal-triggered
fallbacks as successes" and drops to 55.56% when refusals count as failures.

**Cadence.** GPQA metadata reports `updated: 2026-08-26`, three days before this research. Fresh.

**Coverage and joinability.** 135 models on GPQA alone, and the identifiers are **already in
`provider/model` form**: `anthropic/claude-opus-4-5-20251101`, `openai/gpt-5.6-sol`,
`google/gemini-3.1-pro-preview`, `alibaba/qwen3-max`, `zai/glm-5.3`, `ai21labs/jamba-large-1.6`.
Against models.dev: **40/135 exact, 46/135** after stripping a trailing `-thinking`. Highest exact
match rate of any candidate. Residual misses are mostly retired models or provider-key mismatches
(`ai21labs` vs models.dev's `ai21`). Vals treats reasoning mode as a distinct model; models.dev does
not, which is a modelling decision pickai has to make.

**Verdict.** Best identifiers, freshest data, most independent methodology, worst access story and no
license at all.

---

## 12. SWE-bench leaderboard

**Endpoint.** [`https://raw.githubusercontent.com/SWE-bench/swe-bench.github.io/master/data/leaderboards.json`](https://raw.githubusercontent.com/SWE-bench/swe-bench.github.io/master/data/leaderboards.json).
Verified `200`, 7,270,245 bytes, shape `{"leaderboards": [...]}`. [swebench.com](https://www.swebench.com/)
inlines the identical payload in a `<script type="application/json" id="leaderboard-data">` element,
which is why the page is 4.19 MB; prefer the raw URL.

**Access mechanics.** Static JSON, no key. 7 MB per fetch is the real cost.

**License.** The sharp edge. [`SWE-bench/experiments`](https://github.com/SWE-bench/experiments) has
**no license file at all** (`"license": null`), so its contents are all-rights-reserved by default.
The repo that actually holds `leaderboards.json`,
[`SWE-bench/swe-bench.github.io`](https://github.com/SWE-bench/swe-bench.github.io), carries a
[LICENSE](https://github.com/SWE-bench/swe-bench.github.io/blob/master/LICENSE) beginning
"Attribution-NonCommercial 4.0 International", i.e. **CC BY-NC 4.0**. Runtime fetching is arguably
not redistribution, but shipping a cached copy inside an npm package raises a commercial-use question
with no good answer.

**Cadence.** Six leaderboards; newest entry per board: Verified 2026-02-26 (180 entries), bash-only
2026-02-26 (47), Multilingual 2026-02-20 (13), Lite 2025-09-11 (84), Multimodal 2025-11-17 (22), Test
2025-12-19 (24). Verified has had no new entry in six months, deliberately: as of 2025-11-18 Verified
and Multilingual [only accept submissions](https://github.com/SWE-bench/experiments) "from academic
teams and research institutions with open source methods and peer-reviewed publications". Repo pushed
2026-08-10.

**Joinability: disqualifying.** Entries are agent scaffolds, not models:
`"live-SWE-agent + Claude 4.5 Opus medium (20251101)"`, `"TRAE + Claude Sonnet 4 + Opus 4 + Sonnet
3.7 + Gemini 2.5 Pro"`, `"Warp"`, `"ACoder"`. 180 entries collapse to 89 distinct `model_display`
values across 77 `agent` values, and a single row can name four models. A `tags` field sometimes
carries `"Model: claude-opus-4-5-20251101"`, yielding 196 tagged ids over 102 distinct values of
which 43 match models.dev, but the score attaches to the scaffold, not the model, and the same model
scores wildly differently under different scaffolds. 35 of 180 Verified entries are `os_model: true`.

---

## 13. Scale AI SEAL leaderboards

Still alive and rebranded. `scale.com/leaderboard` returns `200` and redirects into **labs.scale.com**;
the page's JSON-LD is titled "Scale Labs, Research Blog" with `dateModified: 2026-08-30T04:27:16Z`.
Scale published [Introducing Scale Labs](https://scale.com/blog/scale-labs) in March 2026, so SEAL
was folded in rather than abandoned. (The Meta acquisition status was not independently verified;
only that the leaderboard is being updated.)

**No public data URL.** Scores are embedded in the Next.js RSC flight payload as escaped JSON:
39 leaderboard categories, 233 score rows, 132 distinct model strings. Representative row:
`{"model":"GPT-5.5 (mini-SWE-agent) xhigh","rank":1,"score":51.6,"company":"openai","createdAt":"2026-06-30T16:12:29.000Z"}`.
Each category carries an `airtableTableName`, confirming an Airtable backing store.

**Cadence.** Score `createdAt` values run 2025-03-05 to 2026-08-24. Categories include SWE-Bench Pro,
SWE Atlas, MCP Atlas, Humanity's Last Exam, Remote Labor Index, VisualToolBench, DrugDiscoveryBench.

**Terms.** [scale.com/robots.txt](https://scale.com/robots.txt) and
[labs.scale.com/robots.txt](https://labs.scale.com/robots.txt) both `Allow: /` with `Disallow: /api/`.
The [Scale Website Terms](https://scale.com/legal/terms) are dated 2021-08-25 and a keyword sweep for
"scrap", "crawl", "spider", "automated means" found no matches, but that sweep ran over an RSC dump
and may not have covered the full legal body. **Unverified, not permission.**

**Joinability: same scaffold problem as SWE-bench.** `"Claude Opus 4.8 (Claude Code) max"`,
`"Fable-5 (Claude Code) xHigh"`, plus intra-dataset duplicates (`"DeepSeek R1"` and `"DeepSeek-R1"`).

---

## 14. EQ-Bench

**Endpoints.** Per-leaderboard JS files, each a single `const X = {...}` assignment that parses after
stripping the prefix and trailing semicolon. All `200`:

- [`creative_writing_chartdata.js`](https://raw.githubusercontent.com/EQ-bench/EQ-bench-site/main/creative_writing_chartdata.js), 308,696 bytes, Creative Writing v3
- [`eqbench3_chartdata.js`](https://raw.githubusercontent.com/EQ-bench/EQ-bench-site/main/eqbench3_chartdata.js), 192,011 bytes
- [`eqbench4/eqbench4_data.js`](https://raw.githubusercontent.com/EQ-bench/EQ-bench-site/main/eqbench4/eqbench4_data.js), 1,055,693 bytes
- [`data/leaderboard_results.json`](https://raw.githubusercontent.com/EQ-bench/EQ-bench-site/main/data/leaderboard_results.json), 1,410,588 bytes, but `generated_at: 2025-11-07`, so stale relative to the JS files

**License.** Weak. [`EQ-bench/EQ-bench-site`](https://github.com/EQ-bench/EQ-bench-site) has **no
LICENSE file**; its README front matter is a HuggingFace Space header saying `license: mit`, which is
a signal, not a grant on the data. Component repos differ: `eqbench3`, `Judgemark-v2` and `EQ-Bench`
are MIT, while `creative-writing-bench`, `longform-writing-bench` and `eqbench-leaderboard-results`
have no license.

**Cadence.** Actively maintained. Per-file last commits: `creative_writing_chartdata.js` 2026-08-24,
`eqbench4_data.js` 2026-07-26, `eqbench3_chartdata.js` 2026-06-19.

**Coverage.** Creative Writing v3: 128 models. EQ-Bench3: 79. EQ-Bench4: 28. Good open-weight
representation. Identifiers are heterogeneous, mixing bare API names with HF paths (`claude-opus-5`,
`gpt-5.6-sol`, `zai-org/GLM-5.2`, `Qwen/Qwen3.8-2.4T-A95B`, `moonshotai/Kimi-K2.6`), where the HF org
prefix is not the models.dev provider. No exact match rate was computed because the id space is
heterogeneous enough that a single number would mislead.

---

## 15. ARC-AGI leaderboard

**Endpoints.** Machine-readable, no key, found via
[`https://arcprize.org/scripts/leaderboard/data.js`](https://arcprize.org/scripts/leaderboard/data.js):
`https://arcprize.org/media/data/leaderboard/v1.json` (115,329 bytes), `v2.json` (116,659 bytes,
verified `200 application/json`), `v3.json` (referenced, not verified), plus
`https://arcprize.org/media/data/models.json`, `providers.json`, `datasets.json`, `evaluations.json`.
`v2.json` is `{version, generatedAt, datasets, evaluations}` with `generatedAt: 2026-08-21T19:53:15Z`.
Evaluation rows are `{datasetId, modelId, modelDisplayName, modelType, providerId, score, costPerTask,
resultsUrl}`, already pre-joined.

**License.** Could not verify. No license statement on the data files, nothing reachable from the
leaderboard page.

**Coverage.** 221 evaluations over 220 distinct `modelId`s in v2, but inflated by reasoning-effort
variants (six rows for `claude-opus-4-5-20251101-thinking-{1k,8k,16k,32k,64k,none}`). Only 4 models
on v3. Open-weight coverage is thin, and a chunk of the list is Kaggle entries and custom
program-synthesis systems rather than LLMs.

**Joinability.** Bad: **15/220**. Naming is idiosyncratic and internally inconsistent
(`gpt-5-1-reasoning`, `openai-gpt-5-6-sol`, `anthropic-opus-4-8-high`, `Claude_3_7_thinking`, `R1`).

---

## 16. llm-stats.com

Not the open dataset it is described as, and the discrepancy is the finding.

The repo is [`JonathanChavezTamales/LLMStats`](https://github.com/JonathanChavezTamales/LLMStats)
(the API reports `full_name: JonathanChavezTamales/llm-leaderboard`; `JonathanChavezTamales/llm-stats`
is a 404). **It is deprecated.** The description says "(deprecated, read more in README)" and the
[README](https://raw.githubusercontent.com/JonathanChavezTamales/LLMStats/main/README.md) opens
"# DEPRECATED, Updates and contributions / This repository is now depracated and won't be getting any
new updates." Last commit anywhere 2025-10-24; last commit touching `data/` 2025-10-22.

The data files are still live (`200`): `data/organizations/<org>/models/<model>/model.json` and
`.../benchmarks.json`, 169 model files and 167 benchmark files. `benchmarks.json` rows are
`{benchmark_id, score, normalized_score, is_self_reported, self_reported_source_link,
verified_by_llmstats, analysis_method, benchmark_name}`. Most rows are `is_self_reported: true` with
`verified_by_llmstats: false`, which is honest but means the scores are vendor claims.

**License is the best of any candidate:**
[LICENSE.md](https://raw.githubusercontent.com/JonathanChavezTamales/LLMStats/main/LICENSE.md) is
**CC BY 4.0**, explicitly allowing commercial adaptation with attribution. GitHub reports
`NOASSERTION` only because the file is `LICENSE.md` rather than `LICENSE`.

**The live successor is key-gated.** `https://api.llm-stats.com/stats/v1/models` returns `401`:
`{"error":{"code":"authentication_required","message":"API key required. Generate one at
https://huggle.ai/settings?tab=api-keys"}}`. The [API docs](https://docs.llm-stats.com/api-reference/introduction.md)
list `/models`, `/benchmarks`, `/scores`, `/rankings`, `/updates` under `Authorization: Bearer`. The
[developer page](https://llm-stats.com/developer) advertises "Free, Unlimited requests" and "380+
models tracked, 50+ verified benchmarks", but every user must sign up, and llm-stats is now a
commercial gateway (ZeroEval) whose data terms were not found stated anywhere. There is an
unauthenticated `https://api.llm-stats.com/v1/models` (`200`, 86 models) but it is the gateway
routing catalog: pricing, context, modalities, **no benchmark scores**.

**Joinability.** Poor: composing `organization_id + "/" + model_id` gives 169 ids, of which **11**
match models.dev exactly. Most misses are models models.dev has retired.

---

## 17. Vellum AI LLM leaderboard

**Disqualified on terms, before the technical difficulty matters.** The
[Vellum Terms of Use](https://www.vellum.ai/docs/vellum-terms-of-use) prohibit users from
"'crawl,' 'scrape,' or 'spider' any page, data, or portion of or relating to the Services (or any
information, data or content made available through the Services), whether through use of manual or
automated means."

Technically it is scraping-only anyway. [vellum.ai/llm-leaderboard](https://www.vellum.ai/llm-leaderboard)
returns `200` / 366,252 bytes, and the leaderboard is pre-rendered React elements inside the RSC
flight payload, not a data array; searching for `modelId` and `model_slug` returns zero hits. The only
structured data is schema.org `DataDownload` prose strings like
`{"name":"Claude Sonnet 5","description":"Claude Sonnet 5 scored 96.2% on GPQA Diamond"}`. The only
`/api/` path referenced is `/api/og`.

---

## 18. SimpleBench

**Endpoint.** [`https://simple-bench.com/static/js/leaderboard-data.js`](https://simple-bench.com/static/js/leaderboard-data.js),
`200`, 24,564 bytes, defining `leaderboardData`, `modelMeta`, `openEndedData`. Rows look like
`{ rank: "1st", model: "Claude Fable", score: "81.9%", organization: "Anthropic", dateAdded:
"2026-06-10" }`.

**Access mechanics.** Static JS, no key, but **not valid JSON**: keys are unquoted JS identifiers, so
consuming it needs a JS5-tolerant parser or a regex extractor. The site's nav now points "Latest
Leaderboard" at [lmcouncil.ai/benchmarks](https://lmcouncil.ai/benchmarks), so the canonical home may
be migrating; lmcouncil.ai was not investigated.

**License.** [`simple-bench/SimpleBench`](https://github.com/simple-bench/SimpleBench) is MIT, but
that repo is the harness and public question set and was last pushed 2024-12-20. The leaderboard JS
is not in it and has no license statement, so the MIT badge does not cover the scores.

**Cadence.** Website data is current: latest `dateAdded` values 2026-08-19, 2026-08-20, 2026-08-22.
Maintained despite the dormant repo.

**Coverage.** 101 rows including 2 human baselines. Bigger than "tiny", but almost entirely frontier
commercial models.

**Joinability: worst of all candidates.** Names are marketing display strings with no provider and no
version (`"Claude Fable"`, `"Gemini 3.1 Pro Preview"`, `"GPT-5.5 Pro"`), no id field, no link field.

---

## 19. MMLU-Pro leaderboard (TIGER-Lab)

**Endpoint.** [`https://huggingface.co/datasets/TIGER-Lab/mmlu_pro_leaderboard_submission/resolve/main/results.csv`](https://huggingface.co/datasets/TIGER-Lab/mmlu_pro_leaderboard_submission/resolve/main/results.csv).
Verified `200`, 27,451 bytes, 262 data rows. Found by reading the Space's
[`utils.py`](https://huggingface.co/spaces/TIGER-Lab/MMLU-Pro/blob/main/utils.py)
(`SUBMISSION_NAME = "mmlu_pro_leaderboard_submission"`). The Space's `src/envs.py` is unmodified
boilerplate pointing at `demo-leaderboard-backend` and is a red herring.

Header: `Models, Data Source, Model Size(B), Overall, Biology, Business, Chemistry, Computer Science,
Economics, Engineering, Health, History, Law, Math, Philosophy, Physics, Psychology, Other`.

**Access mechanics.** One plain HTTPS GET returning 27 KB of CSV. No key, no registration, no
pagination, no scraping, no ZIP, no Parquet. **This is the simplest fetch of every source in this
document.**

**License.** `apache-2.0`, explicitly. The
[dataset card](https://huggingface.co/datasets/TIGER-Lab/mmlu_pro_leaderboard_submission/blob/main/README.md)
is exactly `---\nlicense: apache-2.0\n---`, and the Hub API confirms `cardData.license: apache-2.0`.
The [Space](https://huggingface.co/spaces/TIGER-Lab/MMLU-Pro) is apache-2.0 too. **This is the only
candidate anywhere in this document with an unambiguous permissive license on the results data
itself.**

**What it measures.** 12,000+ questions, 10 answer choices instead of MMLU's 4, 14 domains,
reasoning-weighted ([paper](https://arxiv.org/abs/2406.01574),
[eval scripts](https://github.com/TIGER-AI-Lab/MMLU-Pro)). One axis: knowledge and reasoning
accuracy. No coding, no instruction following, no cost, no latency.

**Cadence.** Dataset `lastModified` 2026-03-11, submission-driven rather than scheduled. The tail of
the CSV carries current-generation models: `Gemini-3.1-Pro` 0.9116, `GPT-5.4` 0.875,
`Claude-4.6-Sonnet(Thinking)` 0.873, `Qwen3.5-122B-A10B`, `Grok-4.1-Fast`,
`Nemotron-3-Nano-30B-A3B`.

**The trust caveat, and it is serious.** The `Data Source` column distinguishes `TIGER-Lab` (they ran
it) from `Self-Reported` (vendor claim). Across all 262 rows: 136 `Self-Reported`, 125 `TIGER-Lab`
(plus two typo'd variants, `TIGER-LAb` and `Sefl-Reported`, which an adapter must handle). But among
the **last 40 rows, 39 are `Self-Reported`** and carry only an `Overall` number with every per-domain
column set to `-`. So exactly the current frontier models pickai users would care about are
unverified vendor marketing numbers, single-column. Filtering to `TIGER-Lab` rows gives you rigour
and 2025-era models; not filtering gives you currency and vendor claims.

**Coverage and joinability.** 262 rows spanning frontier commercial and open-weight. Identifiers are
display names (`Claude-4.6-Sonnet(Thinking)`, `GPT-4o (2024-05-13)`, `Llama-3.1-70B-Instruct`,
`NewenAI/Phi4-sft`). Naive normalization (strip parentheticals, lowercase, space to hyphen, dot to
hyphen) matched **97/262 = 37%** against models.dev ids and display names. Much of the miss is
genuine absence (models.dev does not carry `WizardLM-2-8x22B` or `Aya-Expanse-32B`), so a vendor
alias table would push this higher for the commercial rows.

---

## 20. Stanford HELM

**Endpoints.** Static JSON on a public GCS bucket, no auth. The HELM docs state it outright: "you may
skip this step because the HELM GCS bucket allows public unauthenticated access"
([Downloading Raw Results](https://crfm-helm.readthedocs.io/en/latest/downloading_raw_results/)).
The path segment is `releases/`, not `runs/`:

| URL | Status | Size |
| --- | --- | --- |
| `.../crfm-helm-public/lite/benchmark_output/runs/v1.13.0/schema.json` | 404 | |
| `.../crfm-helm-public/lite/benchmark_output/releases/v1.13.0/schema.json` | 200 | 99 KB |
| `.../lite/benchmark_output/releases/v1.13.0/runs.json` | 200 | **117 MB**, avoid |
| `.../capabilities/benchmark_output/releases/v1.15.0/groups/json/core_scenarios_accuracy.json` | 200 | 116 KB |

The last one is the useful file: `{title, header[], rows[], links, name}` where the header is
`Model, Mean score, MMLU-Pro - COT correct, GPQA - COT correct, IFEval - IFEval Strict Acc, ...`. The
bucket is also enumerable anonymously via the GCS JSON API
(`https://storage.googleapis.com/storage/v1/b/crfm-helm-public/o?prefix=...&delimiter=/`), so an
adapter can discover the latest release rather than pinning a version.

**Which HELM leaderboards are actually current.** Latest release per project, with the `date` from
each `summary.json`:

| Project | Latest release | Date |
| --- | --- | --- |
| Capabilities | v1.15.0 | 2025-11-24 |
| Safety | v1.17.0 | 2025-11-24 |
| AIR-Bench | v1.19.0 | 2025-11-24 |
| Arabic | v2.2.0 | 2026-06-25 |
| MedHELM | v4.0.0 | 2026-01-19 |
| Lite | v1.13.0 | 2025-01-10 |
| MMLU | v1.13.0 | 2025-01-10 |
| Instruct | v1.0.0 | 2024-02-13 (dead) |
| Classic | v0.4.0 | 2023-11-17 (dead) |

So HELM Capabilities is the live general-quality board, nine months stale. The
[HELM homepage](https://crfm.stanford.edu/helm/) lists all of these side by side with no staleness
marker, which is a trap.

**Anomaly worth recording.** Every GCS object checked reports `timeCreated`/`updated` of
`2026-06-10T21:41:27Z`, with v1.12.0 through v1.15.0 all within one second of each other. That is a
bucket-wide re-upload, so **GCS object timestamps are useless as a freshness signal**. Only the
`date` inside `summary.json` is meaningful. An adapter trusting `Last-Modified` would conclude all of
HELM was refreshed in June 2026.

**License.** [`stanford-crfm/helm`](https://github.com/stanford-crfm/helm) is Apache-2.0, not
archived, 2,892 stars, releases through v0.5.16 (2026-04-30). **No explicit license or terms
statement was found for the result data in the GCS bucket.** The download docs describe how to get it
and say nothing about redistribution. Treat the data license as unstated, not as Apache-2.0.

**Coverage and joinability: the best identifiers of any candidate.** Capabilities v1.15.0 has 68
models and HELM ids are already `provider/model`, the same shape as models.dev. Exact string match:
4/68. With light normalization (strip trailing `-YYYYMMDD`, drop `-turbo`/`-fp8`/`-tput`/`-preview`,
alias `deepseek-ai`→`deepseek`, `qwen`→`alibaba`, `zai-org`→`zhipuai`, and match on model name across
providers): **38/68 = 56%**. Residual misses are mostly models models.dev does not carry
(`writer/palmyra-*`, `marin-community/marin-8b-instruct`, `ibm/granite-*`, `allenai/olmo-*`) or HELM
variants (`claude-opus-4-20250514-thinking-10k`). The mix is genuinely both worlds: Anthropic,
OpenAI, Google, Amazon Nova, xAI, Writer, alongside Llama 4, OLMo 2, Qwen 3, DeepSeek V3/R1, Kimi K2,
GLM-4.5-Air, Granite 4, Mistral.

---

## 21. HuggingFace Open LLM Leaderboard (confirmed dead)

**Officially retired 2025-03-13.** Clémentine Fourrier announced it in
[pinned discussion #1135, "It's been a wild ride, folks :) (end of the Open LLM Leaderboard)"](https://huggingface.co/spaces/open-llm-leaderboard/open_llm_leaderboard/discussions/1135):
"the leaderboard is officially retiring... As model capabilities change (hello reasoning and LM
assistants), benchmarks need to follow! The leaderboard is slowly becoming obsolete." The Space
commit log confirms `Hasta la vista, leaderboard` at `2025-03-13T19:18:55Z`, then `edited archived
style` on 2025-03-25. The Space still hard-codes `Open LLM Leaderboard <span>Archived</span>`. v1 is
documented at
[huggingface.co/docs/leaderboards/en/open_llm_leaderboard/archive](https://huggingface.co/docs/leaderboards/en/open_llm_leaderboard/archive).

**HF named no successor.** The announcement points at "over 200 community led leaderboards" and, as a
postscript, the [OpenEvals org](https://huggingface.co/OpenEvals), which is a *directory* of
leaderboards (`OpenEvals/find-a-leaderboard`, `OpenEvals/open_benchmark_index`), not a replacement
leaderboard. No HF statement naming a single successor was found.

**The data is still downloadable.**
`https://datasets-server.huggingface.co/rows?dataset=open-llm-leaderboard%2Fcontents&config=default&split=train&offset=0&length=1`
returns `200` with `num_rows_total: 4576`, 36 columns including `fullname`, `Average ⬆️`, `IFEval`,
`BBH`, `MATH Lvl 5`, `GPQA`, `MUSR`, `MMLU-PRO`, `#Params (B)`, `Hub License`. A single Parquet file
is listed at `https://huggingface.co/api/datasets/open-llm-leaderboard/contents/parquet`.

**No license.** `cardData.license` is `None`, no `license:*` tag, and the dataset card README is
YAML-only with no license key. The *Space* is apache-2.0; the dataset is not.

**Why it fails for pickai anyway.** Dataset `lastModified` 2025-03-20, frozen. 4,576 rows, but
**almost entirely open-weight HF-hosted models plus community fine-tunes and merges, with no frontier
commercial models at all**: no GPT, no Claude, no Gemini. Identifiers are HF repo ids (`0-hero/...`,
`ise-uiuc/...`), the same *shape* as models.dev but a different namespace.

---

## 22. OpenCompass / CompassRank

**A machine-readable endpoint exists but is reverse-engineered, not documented.** Agent-recovered by
instrumenting `page.on("request")` in a headless browser, then verified by curl:

```
POST https://rank.opencompass.org.cn/gw/opencompass-be/api/v1/rank/listRankTableAvailableMonths
Content-Type: application/json
{"rankingType":0,"benchmarkType":1}
```

Verified `200`: `{"traceId":"...","msgCode":"10000","msg":"ok","data":[{"fileName":"assets/llm-rank/llm-data-v2.26-07.20260824.json","updateTime":"2026-08-24","month":"26-07"}, ...]}`.
The `fileName` resolves against
`https://cdn.opencompass.org.cn/assets/llm-rank/llm-data-v2.26-07.20260824.json` (`200`,
`Content-Encoding: gzip`, `Last-Modified: 2026-08-24`). Payload keys: `OverallTable, KnowledgeTable,
ReasonTable, MathTable, CodeTable, models, globalData`. Rows are
`{"model":"Claude Opus 5 (high)","org":"Anthropic","chat_or_base":"Chat","Average":83.3,
"Knowledge":94.1,"Reasoning":68.4,"Math":77.3,"Code":93.3}`.

**Freshest data of any candidate (2026-08-24), and the smallest.** The current snapshot has **15
models**. Historical snapshots are no bigger: 26-04 has 23, 25-10 has 27. Frontier-only, no small
open-weight models, heavily weighted toward Chinese labs. And the scores come from **CompassBench, a
closed eval set**, so they are not reproducible.

**License.** [`open-compass/opencompass`](https://github.com/open-compass/opencompass) is Apache-2.0,
7,375 stars, last push 2026-08-27, clearly alive. **No license or terms statement covering the
CompassRank leaderboard data or the CDN JSON was found.** The repo license covers the harness, not
the rankings.

**Other caveats.** Undocumented, unversioned, POST-only with a magic-number body, gateway path
(`/gw/opencompass-be/`) is an internal routing detail, and the CDN files are gzip-encoded so a raw
`fetch` without decompression gets binary. Site is Chinese-first (`OpenCompass司南 - 评测榜单`), though
column titles are bilingual and model/org names are Latin.

**Verdict.** At 15 models you could hand-maintain a mapping, which is itself the sign that the dataset
is too small to justify an adapter.

---

## 23. BigCodeBench (confirmed abandoned)

**Data URLs work.** [`https://bigcode-bench.github.io/results.json`](https://bigcode-bench.github.io/results.json)
verified `200`, 76,120 bytes, `Last-Modified: Wed, 16 Apr 2025`. 202 entries keyed by display name:
`{"Magicoder-S-DS-6.7B":{"link":"...","open-data":"Partial","pass@1":{"instruct":13.5,"complete":12.8},
"size":6.7,"date":"2024-12-04"}}`. An HF mirror at `bigcode/bigcodebench-results` also works
anonymously via the dataset-viewer (`num_rows_total: 202`).

**Abandoned, decisively.** [`bigcode-project/bigcodebench`](https://github.com/bigcode-project/bigcodebench)
reports `"archived": true`, last push 2026-01-03, and its README now leads with a redirect: "Check
out our latest work! [BigCodeArena](https://arxiv.org/abs/2510.08697)". The results dataset
`lastModified` is 2025-04-17; the site JSON is 2025-04-16. **The HF Space
`bigcode/bigcodebench-leaderboard` is still `RUNNING` while serving data frozen at 2025-02-04**,
which is a trap for anyone eyeballing it.

**License.** The Space card declares apache-2.0 and the archived code repo is Apache-2.0, but the
results are unlicensed: `bigcode/bigcodebench-results` has `cardData.license: None`, and
[`bigcode-bench/bigcode-bench.github.io`](https://github.com/bigcode-bench/bigcode-bench.github.io)
reports `"license": null`.

**Coverage.** 202 models, Complete/Instruct pass@1, newest entry dated 2024-12-04. Nothing from 2025
onward, so every current frontier model is absent.

---

## 24. LiveCodeBench

**Endpoint.** [`https://livecodebench.github.io/performances_generation.json`](https://livecodebench.github.io/performances_generation.json)
verified `200`, 6,950,346 bytes, `Last-Modified: Fri, 01 Aug 2025`. Found in
[`leaderboard.html`](https://livecodebench.github.io/leaderboard.html)
(`const DEFAULT_DATASET = 'performances_generation.json'`).

**The leaderboard is computed client-side from per-problem results.** There is no pre-aggregated
ranking file. Shape: `{"performances":[{question_id, model, date, difficulty, "pass@1", platform},
...29,540 rows], "models":[{model_name, model_repr, release_date, link}, ...28], "date_marks":[...25]}`.
An adapter would have to download 7 MB and aggregate 29,540 rows itself.

**Coverage.** 28 models. Problem `date_marks` span 2023-05-01 to 2025-05-01. Tops out at Claude
Opus/Sonnet 4, Gemini 2.5 Pro, o3/o4-mini, DeepSeek-R1-0528, Qwen3-235B. Nothing from the GPT-5
generation onward.

**License.** The best-stated of the academic set: the site repo
[`LiveCodeBench/livecodebench.github.io`](https://github.com/LiveCodeBench/livecodebench.github.io)
reports `"license": null` on the repo object, but its
[README](https://github.com/LiveCodeBench/livecodebench.github.io/blob/main/README.md) states "This
work is licensed under a Creative Commons Attribution-ShareAlike 4.0 International License."
Share-alike could matter if scores were vendored into a package. The harness repo
[`LiveCodeBench/LiveCodeBench`](https://github.com/LiveCodeBench/LiveCodeBench) is MIT.

**Maintenance.** Harness repo last push 2025-07-16; site repo 2025-08-01. Both quiet for ~13 months.

**Decoy warning.** The HF Space `livecodebench/leaderboard` has `lastModified: 2024-06-07`, is a
`sdk: static` React build with data bundled inside a 10 MB JS file, and its `static_v5` bundle path
404s on the live site. Do not use it.

---

## Comparison

Ranked on the five axes asked for. "Free to user" means no account, no key, no payment. "Joinable"
is the measured normalized match rate against models.dev where one was computed.

| Source | Free to user | License clarity | Maintenance | Coverage | Joinable | Zero-dep fetchable |
| --- | --- | --- | --- | --- | --- | --- |
| **LMArena HF dataset** | Yes | **CC BY 4.0, explicit** | **Daily (2026-08-27)** | **395 text, 499 webdev; open + closed** | 49% | Yes, 4 JSON calls |
| **MMLU-Pro CSV** | Yes | **Apache-2.0, explicit** | 2026-03-11, current models | 262; open + closed | 37% | **Yes, 1 CSV, 27 KB** |
| **Epoch AI ECI** | Yes | **CC BY 4.0, explicit** | **Daily (2026-08-30)** | 324 unique; 151 open-weight | 47% | **No, ZIP only** |
| HELM Capabilities | Yes | **Unstated on data** | 2025-11-24 (9 mo) | 68; open + closed | **56%, best ids** | Yes, 116 KB JSON |
| BFCL v4 | Yes | Apache-2.0 on repo, unstated on CSV | 2026-04-12 (4.5 mo) | 109; best open/closed balance | 44/109 | **Yes, 1 CSV, 33 KB** |
| Vals AI | Yes | **None found anywhere** | **2026-08-26** | 135 on GPQA | **40/135 exact, best** | No, Astro island scrape |
| OpenRouter rankings | Yes | None stated | Daily | 484 | 54%, near-exact for chat | Yes, but usage not quality |
| ARC-AGI | Yes | Unverified | 2026-08-21 | 220, effort-inflated | 15/220 | Yes, JSON |
| EQ-Bench | Yes | **No LICENSE on site repo** | 2026-08-24 | 128 / 79 / 28 | Heterogeneous ids | Needs JS prefix strip |
| SimpleBench | Yes | MIT covers harness, not scores | 2026-08-22 | 101 | Worst, display names only | **No, invalid JSON** |
| Terminal-Bench | Yes | Apache-2.0 | 2026-08-30 | Agent+model pairs | Scaffold, not model | Via Epoch ZIP |
| OpenCompass | Yes | Unstated on data | **2026-08-24** | **15** | Hand-mappable | Undocumented POST + gzip |
| SWE-bench | Yes | **CC BY-NC 4.0** | Verified frozen 2026-02-26 | 180 scaffolds | Scaffold, not model | 7 MB JSON |
| Scale SEAL | Yes | Unverified | 2026-08-24 | 132 scaffold strings | Scaffold, not model | RSC payload scrape |
| Aider polyglot | Yes | Apache-2.0 | **Frozen 2025-10-04** | 69 | Display names | No, YAML |
| LiveBench | Yes | **None on site repo** | Site migration in flight | 48 | Effort-suffixed | Unstable URL |
| LiveCodeBench | Yes | CC BY-SA 4.0 in README | **Frozen 2025-08-01** | 28 | Mixed | 7 MB, needs aggregation |
| llm-stats repo | Yes | **CC BY 4.0, explicit** | **Deprecated 2025-10-24** | 169, self-reported | 11/169 | Yes, many small files |
| llm-stats API | **No, signup** | Not stated | Live | 380+ claimed | Unknown | Yes |
| Artificial Analysis | **No, signup** | Attribution only, no redistribution | Live | Broad | Good | Yes |
| BigCodeBench | Yes | Unlicensed results | **Archived 2026-01-03** | 202, none after 2024-12 | Display names | Yes |
| HF Open LLM Leaderboard | Yes | **None** | **Retired 2025-03-13** | 4,576, **no commercial models** | HF namespace | Yes |
| Vellum | Yes | **Scraping forbidden by ToU** | Live | Unknown | N/A | No |

### What I could not verify

- Anonymous rate limits on `datasets-server.huggingface.co`. The docs show an `Authorization` header
  in every example but the calls succeed without one, and no anonymous limit is documented.
- Whether the BFCL CSV served from the Berkeley web host inherits the gorilla repo's Apache-2.0.
- Any data-redistribution term for the HELM GCS bucket, the OpenCompass CDN JSON, the BigCodeBench
  results, the ARC-AGI JSON, or Vals AI. All were searched for and none was found.
- Whether Scale's 2021-dated Website Terms prohibit scraping. The keyword sweep found nothing, but it
  ran over an RSC dump that may not have contained the full legal body.
- CORS behaviour for any of these endpoints from a browser context. Everything here was probed
  server-side with curl. If pickai is meant to work in the browser, this needs re-testing.
- Whether the LiveBench CSV path survives the `new-livebench.ai` migration.
- Whether swe-rebench.com publishes machine-readable model scores.

### Recommendation

**Ship LMArena's official HF dataset (`lmarena-ai/leaderboard-dataset`) as the one built-in adapter.**
It is the only source that is simultaneously free with no account, explicitly CC BY 4.0, updated
daily, covers 395 models across open-weight and commercial, fetchable as plain JSON with zero
dependencies, and joinable at ~49% by normalization alone. It also lets pickai keep the human
preference framing its existing example already documents, and its `webdev` and `agent` subsets give
future axes without a new adapter.

**Second choice: MMLU-Pro's `results.csv`**, if the priority is packaging simplicity and license
certainty over currency. One 27 KB CSV, Apache-2.0, no pagination. The cost is that 39 of the last 40
rows are `Self-Reported` vendor claims with only an `Overall` number, so the models users care about
most carry the least rigour.

**Third: Epoch AI's Capabilities Index**, which is the best *metric* here (one composite quality
number, plus an open-weights accessibility flag pickai lacks) with the clearest license, but it ships
only as a ZIP. Worth asking Epoch for a stable per-file CSV URL before writing it off.
