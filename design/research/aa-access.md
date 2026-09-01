# Artificial Analysis API: cost, access, and redistribution terms

Research date: 2026-08-30. Question: can pickai ship a built-in Artificial Analysis (AA)
benchmark adapter without our users paying a third party, and do the terms allow it?

Primary sources are the AA [Data API landing page](https://artificialanalysis.ai/data-api),
the [Data API docs](https://artificialanalysis.ai/data-api/docs), the machine-readable
[OpenAPI spec](https://artificialanalysis.ai/api/v2/openapi), the
[Terms of Use](https://artificialanalysis.ai/docs/legal/Terms-of-Use.pdf), and the
[Data Platform Terms](https://artificialanalysiscdn.com/legal/ProDataPlatformTerms.pdf).
Where a claim comes from a live API call rather than a document, it is labelled as such.

## Headline answer

The free tier is real and costs nothing, but two things make it unusable as the basis of a
shipped pickai feature:

1. The free tier no longer returns individual benchmark scores. It returns three composite
   indices only.
2. The Data Platform Terms contain an anti-competitive clause that names "model/provider
   selection guidance" as a prohibited use, and a redistribution clause that prohibits
   embedding the data in a customer-facing product. pickai is squarely inside both.

Separately, the endpoint our current example uses is deprecated with a hard sunset of
2026-11-04.

## 1. Is there a free tier, and what exactly does it include?

Yes. The [Data API page](https://artificialanalysis.ai/data-api) lists a Free API priced at
`$0` with a `100 requests` daily rate limit, restricted to organizations of
`<150 employees`.

### Rate limits

The [docs rate-limit section](https://artificialanalysis.ai/data-api/docs#rate-limits) and
the [OpenAPI `info.description`](https://artificialanalysis.ai/api/v2/openapi) both give:

| Tier | Requests per 24-hour window |
| --- | --- |
| Free | 100 |
| Pro | 500 |
| Commercial | Custom |

The window is fixed, not rolling: the first request after a window ends starts a new one,
and the full quota resets only when that window ends. The quota is shared across every key
in a user-or-organization scope, not per key. Responses carry `X-AA-Tier`,
`X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `X-RateLimit-Reset`, and `429` responses
add `Retry-After`. All from the
[docs rate-limit and response-header sections](https://artificialanalysis.ai/data-api/docs#rate-limits).

**Verified live** (2026-08-30, using the key already in the repo `.env`): a call to
`/api/v2/language/models/free` returned `x-aa-tier: free`, `x-ratelimit-limit: 100`,
`x-ratelimit-remaining: 99`.

### Which endpoints

Free keys may call the `/free` model-list endpoints only:
`/api/v2/language/models/free` plus eleven media siblings. Every standard non-`/free` V2
route returns `403` for a free key. This is stated in the
[OpenAPI tier table](https://artificialanalysis.ai/api/v2/openapi) ("Standard non-`/free`
routes are Pro+ and return `403` for Free API keys") and in the
[docs Tiers section](https://artificialanalysis.ai/data-api/docs#tiers).

The [free-tier endpoint description](https://artificialanalysis.ai/data-api/docs#getLanguageModelsFree)
says it "Excludes Pro-only fields such as the full evaluation set, token counts, blended
pricing, performance percentiles, context window, parameters, modalities, licensing, and
provider detail."

### Which fields

The `FreeEvaluations` schema in the
[OpenAPI spec](https://artificialanalysis.ai/api/v2/openapi) has exactly three required
properties and no others:

- `artificial_analysis_intelligence_index`
- `artificial_analysis_coding_index`
- `artificial_analysis_agentic_index`

with the description "Composite Artificial Analysis indices. Pro tier adds per-benchmark
scores."

The rest of a free record: `id`, `name`, `slug`, `release_date`, `model_creator` (`id` and
`name` only), `artificial_analysis_intelligence_index_cost` (total plus
`cost_per_task.total_cost`), `pricing` (input, output, cache-hit, cache-write per 1M
tokens), and `performance` (four median metrics: output tokens/sec, TTFT, time to first
answer token, end-to-end response time). Notably **`context_window_tokens` is Pro-only**,
per the [`/language/models` schema notes](https://artificialanalysis.ai/data-api/docs#getLanguageModels).

**Verified live** (2026-08-30): `tier: "free"`, `intelligence_index_version: 4.1`,
`pagination: {page: 1, page_size: 200, total_pages: 4, has_more: true}`, and the first
record's `evaluations` object contained exactly the three composite keys above.

Practical consequence: a full free-tier catalog fetch is **4 requests** (4 pages of 200),
so the 100/day quota allows roughly 25 full refreshes per day per organization scope.

### The comparison table, cell by cell

Rendered from the icons in the
[Data API page](https://artificialanalysis.ai/data-api) markup (check = included,
cross = excluded):

| Capability | Free | Pro | Commercial |
| --- | --- | --- | --- |
| Model identity and headline indices | yes | yes | yes |
| Arena rankings (image, video, speech, music) | yes | yes | yes |
| Input and output token pricing | yes | yes | yes |
| Median performance metrics | yes | yes | yes |
| Individual evaluation scores | **no** | yes | yes |
| Blended pricing fields | no | yes | yes |
| Performance percentiles (P5 to P95) | no | yes | yes |
| Performance over time (7, 30, 90 day) | no | no | yes |
| Openness Index (8 component breakdown) | no | yes | yes |
| Per-provider data per model | no | no | yes |
| Raw provider measurements | no | no | approved providers only |
| Redistribution rights | Internal use only with attribution | Restricted external use | Commercial redistribution with attribution |

Pro is `$417/month per seat` (or yearly, saving `$984`), single seat, per the
[pricing page](https://artificialanalysis.ai/pricing). That page also states "We don't
currently offer free trials."

## 2. Is a credit card or paid plan required to get a key at all?

No, on the documentary evidence. The
[Data API page](https://artificialanalysis.ai/data-api) describes the Free API as
"Self-serve: Sign in, create a key, and call the public LLM and media endpoints", priced
`$0`. The [docs getting-started section](https://artificialanalysis.ai/data-api/docs#getting-started)
says to open API key management and create a key, sending you through login first. The
[login page](https://artificialanalysis.ai/login) offers Google, Microsoft, or email, with
no payment step shown.

**Could not verify:** I did not create a new account, so I cannot confirm first-hand that
the signup flow never asks for a card, nor whether it requires a work email or an
organization declaration. The `<150 employees` restriction on the Free tier in the
comparison table is a stated eligibility condition, but I found nothing describing how or
whether it is enforced at signup.

## 3. Licensing and terms of use on the returned data

Two documents govern, and the docs say both apply:
"Use of the API is also subject to our Terms of Use and Data Platform Terms"
([docs, Attribution and licensing](https://artificialanalysis.ai/data-api/docs#attribution);
same text in the [OpenAPI description](https://artificialanalysis.ai/api/v2/openapi)).

### Data Platform Terms (v1.1, last revised 2026-08-19)

The [Data Platform Terms](https://artificialanalysiscdn.com/legal/ProDataPlatformTerms.pdf)
open by stating their scope explicitly covers the free tier: "These Terms also govern
access to and use of the Artificial Analysis API on the free tier."

**Section 2.5, Anti-Competitive Restrictions** is the blocking clause for pickai:

> Customer shall not use the Data to develop, operate, or improve any product or service
> made available to third parties whose primary purpose is benchmarking, ranking,
> comparison, competitive intelligence, or **model/provider selection guidance**, without
> Company's prior written consent.

Section 1.9 defines "Competitive Product" the same way, again naming "model/provider
selection guidance for artificial intelligence models."

**Section 2.4, Redistribution Restrictions** prohibits, among other things:

> (c) Embed or otherwise make raw Data available through any customer-facing product, API,
> dashboard, or service.
> (d) Combine Data with data from third-party sources to create a product, dataset, or
> service that is made available to any third party.

(d) describes exactly what a pickai AA adapter would do: join AA scores onto a models.dev
catalog.

**Section 2.3, Permitted Uses by Tier.** All tiers may use Data for Internal Use, share
charts and visualizations publicly with attribution, and "make brief citations of individual
Data points in publicly available content (e.g., blog posts, articles, press releases),
provided such citations include the attribution 'Source: Artificial Analysis
(artificialanalysis.ai)' with a hyperlink where technically feasible **and do not reproduce
Data in a structured, tabular, or machine-readable format**."

Section 1.7 defines Internal Use as use "solely within Customer's own organization, by
Authorized Users" and "expressly excludes any use that makes raw Data files available to,
or for the direct benefit of, any third party."

**Section 5, Attribution.** Required at all tiers, "no exceptions", whenever Data or Derived
Data is shared outside internal systems. The required form depends on content type: charts
need the AA logo visible; data and metrics need "Source: Artificial Analysis
(artificialanalysis.ai)" with a hyperlink where feasible; Derived Data needs "Based on data
from Artificial Analysis" plus a non-endorsement statement (Section 5.2).

**Section 2.6(d)** additionally prohibits using the Data to train or fine-tune any AI/ML
model without prior written consent.

**Sections 10.3 and 10.4.** Breaches of 2.4, 2.5, 2.6, 3, or 5 are carved out of the
liability cap entirely ("shall not be subject to any cap") and carry an indemnification
obligation. Section 11.5 allows immediate termination without notice where use is "in
connection with a Competitive Product."

**Section 11.7** requires deleting all copies of raw Data within 30 days of termination.

### Website Terms of Use (v1.0, last revised 2024-04-28)

The [Terms of Use](https://artificialanalysis.ai/docs/legal/Terms-of-Use.pdf) are an older,
generic website ToU. Section 2.1 grants a license "solely for your own personal,
noncommercial use". Section 2.2 forbids commercially exploiting "any content displayed on
the Site", building "a similar or competitive website, product, or service", and copying or
redistributing any part of the Site. Section 3.3 forbids automated scripts that "strip,
scrape, or mine data from" the Site.

These are website terms and predate the API tiering by two years, so the Data Platform Terms
are the operative document for API data. I note them because AA cites both, and the older
document is, if anything, stricter.

### Answers to the specific questions

- **Can an open-source library fetch and display AA data?** Fetching is fine for a
  developer's own internal use. Shipping the fetch-and-join as a library feature is not:
  2.4(c) prohibits embedding the data in a customer-facing product or service, 2.4(d)
  prohibits combining it with third-party data into something made available to third
  parties, and 2.5 prohibits using it to build a model-selection-guidance product at all
  without prior written consent.
- **Can results be cached?** The legacy
  [API Reference page](https://artificialanalysis.ai/api-reference) actively recommends it:
  "please do not include in client side code and cache responses." Caching for Internal Use
  is fine. Caching and then shipping or serving the cache is External Distribution under
  Section 1.8 and prohibited by 2.4.
- **Is attribution required, and in what form?** Yes, at every tier, with no exceptions
  (Section 5.1). Data and metrics: "Source: Artificial Analysis (artificialanalysis.ai)"
  with a hyperlink where feasible. Charts: the AA logo visible on the chart. Derived Data:
  "Based on data from Artificial Analysis" plus a non-endorsement statement. The
  [docs](https://artificialanalysis.ai/data-api/docs#attribution) soften this to "A visible
  byline or footer link is sufficient", and the
  [legacy API reference](https://artificialanalysis.ai/api-reference) points at the
  [brand kit](https://artificialanalysis.ai/) for logo use.
- **Is commercial use permitted?** Commercial *internal* use is permitted on Pro and
  Commercial per the Section 1.13 feature table. The free tier's own row in the
  [Data API page](https://artificialanalysis.ai/data-api) comparison says "Internal use only
  with attribution". External redistribution rights require a Commercial Order Form, and the
  2.5 anti-competitive restriction applies to Pro and Commercial in full (Section 4.2), so
  paying does not by itself unlock our use case. Section 2.5 requires "prior written
  consent" regardless of tier.

## 4. What does the Intelligence Index blend, and is the breakdown free?

Current version is **v4.1.1**. Per the
[Intelligence Index methodology page](https://artificialanalysis.ai/methodology/intelligence-benchmarking)
and the [docs versioning section](https://artificialanalysis.ai/data-api/docs#intelligence-index-versioning),
it incorporates **9 evaluations**:

GDPval-AA v2, τ³-Banking, Terminal-Bench v2.1, SciCode, AA-LCR, AA-Omniscience, HLE
(Humanity's Last Exam), GPQA Diamond, CritPt.

Category weights, from the v4.1 entry in the methodology page's version history: Agents 34%,
Coding 24%, Scientific Reasoning 24%, General 18%, with AA-Omniscience split into Accuracy
(8%) and Non-Hallucination (4%).

`artificial_analysis_coding_index` and `artificial_analysis_agentic_index` are described as
derived from subsets of the same evaluations and are not separately versioned.

**Only the composites are exposed on the free tier.** The `FreeEvaluations` schema has three
properties. The Pro shape, per the
[`/language/models` example response](https://artificialanalysis.ai/data-api/docs#getLanguageModels),
adds `tau2_telecom`, `tau_banking`, `terminalbench_hard`, `terminalbench_v2_1`, `scicode`,
`aa_lcr`, `aa_omniscience_index`, `aa_omniscience_accuracy`,
`aa_omniscience_non_hallucination_rate`, `ifbench`, `hle`, `gpqa_diamond`, `critpt`,
`gdpval_aa_elo`, `gdpval_aa_normalized`, `mmmu_pro`,
`artificial_analysis_openness_index`, and `artificial_analysis_multilingual_index`.

Responses carry `intelligence_index_version` (major.minor only) so a consumer can tell which
index generation a score belongs to. Patch bumps can change scores without changing that
field.

## 5. Has the free tier changed recently?

Yes, repeatedly, and there is a hard deadline coming.

**The endpoint pickai's example uses is deprecated.** `/api/v2/data/llms/models` returns
these headers (**verified live**, 2026-08-30):

```
deprecation: @1785801600          (2026-08-04T00:00:00Z)
sunset: Wed, 04 Nov 2026 23:59:59 GMT
link: <https://artificialanalysis.ai/data-api/migrate-v2-data>; rel="deprecation"
```

The [migration guide](https://artificialanalysis.ai/data-api/migrate-v2-data) confirms:
"Legacy Data API endpoints retire November 4, 2026 ... After the retirement date, legacy
requests will return `410 Gone`". Its table maps `/api/v2/data/llms/models` to a free
replacement (`/api/v2/language/models/free`) and a Pro replacement
(`/api/v2/language/models`), noting "Free endpoints return fewer fields."

**The legacy endpoint currently still returns individual benchmark scores.** Verified live
on 2026-08-30 with a free-tier key: it returned all 624 models unpaginated in one request,
with an `evaluations` object containing `artificial_analysis_intelligence_index`,
`artificial_analysis_coding_index`, `artificial_analysis_math_index`, `mmlu_pro`, `gpqa`,
`hle`, `livecodebench`, `scicode`, `math_500`, `aime`, `aime_25`, `ifbench`, `lcr`,
`terminalbench_hard`, `terminalbench_v2_1`, `tau2`, `tau_banking`. Intelligence Index values
matched the free V2 endpoint exactly for every model I spot-checked. It returned no
`X-RateLimit-*` headers, so I could not determine which quota it draws on. This is the
capability that disappears on 2026-11-04.

**Timeline of tier changes:**

- **2026-03-13** and earlier: the [legacy API Reference](https://artificialanalysis.ai/api-reference)
  documented a single "Free API" at 1,000 requests per day returning per-benchmark scores.
  The [Wayback capture of 2026-03-13](https://web.archive.org/web/20260313122043/https://artificialanalysis.ai/api-reference)
  is byte-for-byte identical to the live page on this point, so that page has not been
  updated in at least five months and now contradicts the current docs.
- **By 2026-06-23**: the new tiered docs existed. The
  [Wayback capture of 2026-06-23](https://web.archive.org/web/20260623101223/https://artificialanalysis.ai/data-api/docs)
  already shows Free at **100** requests per day and the three-composite free shape. It is
  the earliest capture of `/data-api/docs` in the
  [Wayback CDX index](https://web.archive.org/cdx/search/cdx?url=artificialanalysis.ai/data-api*&output=json).
  Attribution in that version cited the Terms of Use only.
- **2026-08-04**: deprecation date stamped on the legacy `/api/v2/data/*` endpoints.
- **2026-08-19**: [Data Platform Terms](https://artificialanalysiscdn.com/legal/ProDataPlatformTerms.pdf)
  v1.1, whose Scope section newly extends the terms to the free tier. The live docs now cite
  both Terms of Use and Data Platform Terms where the June version cited only the former.
- **2026-11-04**: legacy endpoints return `410 Gone`.

Also changed between June and now: the rate-limit window description moved from "reset each
day at 00:00 UTC" (June capture) to the current fixed-24-hour-from-first-request model, and
the `403` error description gained the CritPt per-account-approval case.

**Could not verify:** whether the free tier was ever 1,000/day on the new V2 endpoints, or
exactly when it dropped to 100. The oldest capture of the new docs already says 100. AA's
[changelog](https://artificialanalysis.ai/changelog) tracks model and methodology updates but
carries no entries about API access tiers, so there is no first-party announcement of the
tier change that I could find.

## What this means for pickai

The blocker is not price. The free tier costs nothing and no card is needed. The blockers are:

1. **Data.** The free tier gives three composite numbers, not the per-benchmark scores that
   would make a rich adapter worth building. The endpoint that still gives per-benchmark
   scores dies on 2026-11-04.
2. **Terms.** Section 2.5 names "model/provider selection guidance" as a use requiring AA's
   prior written consent, at every tier. Section 2.4(c) and (d) prohibit embedding the data
   in a customer-facing product or combining it with third-party data for third parties.
   Shipping an adapter as a library feature is not covered by any self-serve tier.
3. **Quota.** Even for a documentation example, 100 requests per day shared across an
   organization, against a 4-page catalog, is 25 full refreshes per day.

Our current `examples/aa-benchmarks.ts` calls the deprecated endpoint and reads
`evaluations.artificial_analysis_intelligence_index`. That field survives the migration; the
endpoint does not. Its comment claiming "the AA API also exposes individual benchmark scores
(GPQA, IFBench, MMLU, etc.) you could use as separate criteria" is no longer true on the free
tier.
