# Which benchmark data source do developers actually depend on?

Research date: 2026-08-30. Question: pickai needs to build in exactly one third-party
benchmark source. Which one do real projects already consume programmatically, and which
one still has a reputation worth borrowing?

## Bottom line

**Artificial Analysis is the widely used one. Epoch AI's benchmarking hub is the more
defensible one. They are not the same answer, and the gap is the decision.**

Artificial Analysis (AA) wins on adoption by a wide margin, and the decisive fact is that
[OpenRouter's public, keyless `/api/v1/models` endpoint now embeds AA's indices directly](https://openrouter.ai/docs/guides/overview/models)
under a `benchmarks` object. I verified this with an unauthenticated request: of 396 models
returned, 165 carry `benchmarks.artificial_analysis` with `intelligence_index`,
`coding_index`, and `agentic_index`, and 152 carry `design_arena` ELO/win-rate/rank rows.
That means AA's headline numbers are already reachable with zero keys and zero signup,
through an endpoint pickai's likely users already hit.

Epoch AI wins on licence cleanliness, keyless bulk access, methodological transparency, and
having survived independent replication. It loses badly on adoption: its ECI reference
implementation has 6 stars.

LMArena (now [arena.ai](https://arena.ai/leaderboard)) is not displaced as the most *cited*
leaderboard, but among developers choosing a model for work it has been demoted to a
narrow instrument. Its data did get materially easier to consume in 2026, which changes the
mechanics but not the trust picture.

---

## Method, and what I could not verify

Evidence gathered from: GitHub code search via `gh api` (counts as of 2026-08-30), direct
unauthenticated HTTP probes of candidate endpoints, and Exa web search plus content fetch.

What I could **not** verify:

- **Reddit directly.** Reddit blocks unauthenticated JSON, and Exa does not index
  `reddit.com` (domain-restricted searches returned zero results). r/LocalLLaMA quotes below
  come from third-party mirrors and archives, which I have linked. Treat them as
  second-hand.
- **GitHub code search totals are approximate.** It indexes only default branches of public
  repos and caps results. Counts are directionally useful, not exact.
- **OpenRouter's redistribution terms for the `benchmarks` field.** Their OpenAPI spec
  explicitly licenses the *Datasets* endpoints under
  [CC BY 4.0](https://openrouter.ai/docs/api/api-reference/benchmarks/list-benchmarks), but
  the `/models` endpoint is not in that tag. Whether re-serving AA-derived indices obtained
  through OpenRouter is permitted is unresolved and would need a direct answer from
  OpenRouter or AA.
- **AA's revenue mix.** AA states it is independent and lists angel backers, but I found no
  disclosure of whether AI labs are paying customers. Absence of evidence, not evidence of
  absence.
- One source in the "trust" section ([Hugging Face
  forums](https://discuss.huggingface.co/t/what-is-your-preferred-site-to-see-ai-scores-on-different-ai-tests/174698/1))
  reads as LLM-generated. I have flagged it inline rather than dropped it, because it is
  still an artefact of what people repeat.

---

## 1. Adoption evidence: what appears in real code

### GitHub code search totals (2026-08-30)

| Query | Hits | What the hits actually are |
| --- | --- | --- |
| `openrouter.ai/api/v1/models` | 1,948 | Genuine catalog fetches |
| `artificialanalysis.ai` | 1,604 | Mostly genuine: clients, fetchers, sync scripts |
| `models.dev/api.json` | 876 | Genuine (pickai's own base) |
| `lmarena.ai` | 605 | **Mostly not data use.** See below |
| `AA_API_KEY` | 111 | Genuine credential wiring |
| `artificial_analysis_intelligence_index` | 64 | Genuine field access |
| `artificialanalysis.ai/api` | 61 | Genuine API calls |
| `lmarena-ai/leaderboard-dataset` | 20 | Genuine, but new (dataset released Apr 2026) |
| `benchmarks.artificial_analysis` | 11 | Consumers of OpenRouter's embedded AA field |

**The `lmarena.ai` count is a trap.** Sampling 60 of the hits, the overwhelming majority are
proxy and GFW circumvention rule lists that list the domain as a string:
[`blackmatrix7/ios_rule_script`](https://github.com/blackmatrix7/ios_rule_script) alone
accounts for 12, plus [`ACL4SSR/ACL4SSR`](https://github.com/ACL4SSR/ACL4SSR),
[`gfwlist/gfwlist`](https://github.com/gfwlist/gfwlist), Shadowrocket and Surge rulesets.
The rest are awesome-lists and documentation. Almost no code fetches LMArena *scores*. The
two exceptions are scrapers that reverse-engineer the site rather than consume a feed:
[`CloudWaddie/LMArenaBridge`](https://github.com/CloudWaddie/LMArenaBridge) (397 stars, but
it proxies *models*, not the leaderboard) and `diegosouzapw/OmniRoute`'s
`lmarenaTlsClient.ts`.

### Named consumers of Artificial Analysis, with weight

- **[BasedHardware/omi](https://github.com/BasedHardware/omi)** (13,334 stars, pushed
  2026-08-30). `backend/routers/auto_model.py` picks the realtime-voice provider by scoring
  AA's intelligence index against measured speed. The comments are worth quoting because
  they show the terms being respected in practice:

  > Picks the realtime provider whose underlying model scores best on a simple quality/speed
  > formula, refreshed once a day from Artificial Analysis (https://artificialanalysis.ai —
  > attribution required). Done server-side so the AA key never ships in the client and the
  > response is cached (per AA's terms).

  It weights quality 0.65 / speed 0.35 and caches for 24 hours.

- **[llm-d-incubation/llm-d-planner](https://github.com/llm-d-incubation/llm-d-planner)** (28
  stars, Apache 2.0, active). The closest analogue to pickai: an open-source recommendation
  engine that needs quality scores. It uses **both**, with
  [`aa_client.py`](https://github.com/llm-d-incubation/llm-d-planner/blob/main/src/quality_scoring/aa_client.py)
  hitting `https://artificialanalysis.ai/api/v2/language/models/free` and
  `arena_client.py` loading `lmarena-ai/leaderboard-dataset` from Hugging Face. Its README
  footer reads: "Quality data provided by Artificial Analysis and Arena." Notably, its
  maintainer is the person who
  [asked Arena to put an explicit open licence on the dataset](https://huggingface.co/datasets/lmarena-ai/leaderboard-dataset/discussions/2),
  precisely because an Apache-2.0 tool could not otherwise use it.

- A long tail of smaller projects with real fetch code:
  `nicholasgriffintn/ai-platform` (29 stars) ships an `ArtificialAnalysisScorePanel.tsx`;
  `EvanZhouDev/ai-model-index` (9 stars) vendors `data/llm/aa-intelligence.json`;
  `Alexlovereading/AI-Radar`, `Quarkgluonmixture/quarkspace`, `nglmercer/freellmapiV2` (Rust),
  `rodion-m/models-labyrinth`, `fmoreau69/wama`, `ismigar/Gnosi`, `ThomasRochefortB/llm-launchpad`,
  `forecastingresearch/utils`, `krishanraja/mindmake` all have dedicated AA fetchers. Individually
  tiny; collectively the clearest signal that AA is the default reach.

**Honest caveat on that tail:** almost all of it is 0 to 30 stars, and much of it looks
recently generated. The load-bearing adoption evidence is OpenRouter and omi, not the count.

### What Epoch AI's adoption looks like

Thin. [`epoch-research/eci-public`](https://github.com/epoch-research/eci-public) has **6
stars** (MIT, pushed 2026-08-06). Code search for `epoch.ai benchmark data` returns 175
hits, but sampling shows they are dominated by awesome-lists
(`panilya/awesome-ai-benchmarks`, `QuesmaOrg/awesome-ai-tokenomics`,
`AthenaCore/AwesomeResponsibleAI`) rather than fetch code. The one substantial exception is
[`UKGovernmentBEIS/inspect_evals`](https://github.com/UKGovernmentBEIS/inspect_evals), and
that is a relationship of shared tooling (Epoch runs its own evals on Inspect) rather than
data consumption.

### Sources that are dead or dying

- **Hugging Face Open LLM Leaderboard: retired March 2025.** Maintainer Clémentine
  Fourrier's [closing post](https://huggingface.co/spaces/open-llm-leaderboard/open_llm_leaderboard/discussions/1135):
  > all good things come to an end: the leaderboard is officially retiring! ... The
  > leaderboard is slowly becoming obsolete; we feel it could encourage people to hill climb
  > irrelevant directions in the field. So we'd like to stop it before it happens :)
- **Aider polyglot leaderboard: effectively dormant.**
  [`Aider-AI/aider`](https://github.com/Aider-AI/aider) has 48,590 stars but has not been
  pushed since 2026-05-22. The leaderboard survives mainly as a
  [redistributed CSV inside Epoch's hub](https://epoch.ai/benchmarks/use-this-data).
- **llm-stats.com's open dataset: deprecated.**
  [`JonathanChavezTamales/llm-leaderboard`](https://github.com/JonathanChavezTamales/llm-leaderboard)
  (356 stars) is marked "DEPRECATED ... won't be getting any new updates"; the data moved
  behind [llm-stats.com's own API](https://llm-stats.com/developer), now served from
  `api.zeroeval.com` and requiring a key.

---

## 2. Products that display third-party benchmark data, and who they cite

**OpenRouter cites Artificial Analysis, explicitly and by name.** From their
[February 2026 release spotlight](https://openrouter.ai/blog/announcements/february-release-spotlight/):

> **Benchmarks on Model Pages.** Every model page now shows industry-standard benchmark
> scores powered by Artificial Analysis: programming, math, science, long-context reasoning,
> and more. See how models actually perform before you pick one.

They went further and put it in the API. Their
[unified `/benchmarks` endpoint](https://openrouter.ai/docs/api/api-reference/benchmarks/list-benchmarks)
"aggregates scores from multiple benchmark sources (Artificial Analysis, Design Arena, and
OpenRouter's own tau-bench, GPQA, and web-search evals)". That endpoint needs a key and is
capped at 30 req/min and 500 req/day, but the plain `/api/v1/models` endpoint carries the AA
indices with **no key at all** (verified 2026-08-30).

**Design Arena is the second source OpenRouter embeds**, and it is interesting for a
mechanical reason: its
[leaderboard API](https://docs.designarena.ai/api-reference/leaderboard) keys every entry to
an `openRouterId` "to cross-reference leaderboard entries with OpenRouter's model catalog
for pricing, context windows, and other metadata." It solves the identity-mapping problem
that pickai would otherwise have to solve. Its direct API requires a key; via OpenRouter it
does not.

**llm-d-planner** cites both AA and Arena in its README, as above.

**Notably, models.dev carries no benchmark data at all.** I pulled the full
`https://models.dev/api.json` (211 providers) and enumerated every model key:
`attachment, cost, description, experimental, family, id, interleaved, knowledge, last_updated,
limit, modalities, name, open_weights, provider, reasoning, reasoning_options, release_date,
status, structured_output, temperature, tool_call`. There is no quality field and no hook for
one. Whatever pickai builds in has to come from a second source and be joined by model
identity.

---

## 3. Widely used vs. widely trusted: they differ, and here is where

The two lists diverge sharply, and the divergence is the whole point of this section.

**Most used: LMArena (cited), Artificial Analysis (consumed), OpenRouter (as a conduit).**
**Most trusted by people who say why: Artificial Analysis, then Epoch AI. LiveBench and
LMArena are actively distrusted.**

### On LMArena

> LMArena is, de facto, a sycophancy and Markdown usage detector.
>
> Two others you can trust, off the top of my head, are LiveBench.ai and Artifical Analysis.
> Or even Humanity's Last Exam results.
>
> [HN 46803786](https://news.ycombinator.com/item?id=46803786)

> Lm arena is so easy to game that it's ceased to be a relevant metric over a year ago.
> People are not usable validators beyond "yeah that looks good to me", nobody checks if the
> facts are correct or not.
>
> moffkalast, [HN 47617608](https://news.ycombinator.com/item?id=47617608)

> I agree; LMArena died for me with the Llama 4 debacle. And not only the gamed scores, but
> seeing with shock and horror the answers people found good. It does test something though:
> the general "vibe" and how human/friendly and knowledgeable it *seems* to be.
>
> [HN 47617034](https://news.ycombinator.com/item?id=47617034)

The counter-position, from the same thread, is narrow but real:

> Public benchmarks can be trivially faked. Lmarena is a bit harder to fake and is
> human-evaluated. ... I place more weight on Lmarena scores and private benchmarks.
>
> [HN 47617034](https://news.ycombinator.com/item?id=47617034)

### On LiveBench: this one is worse than expected

LiveBench is often name-checked as the "trustworthy" alternative, but the people who watch
it closely have turned on it. From a June 2026 r/LocalLLaMA thread
([mirror](https://reddit.sentinel-team.org/posts/1u1ubrg/snapshots/2026-06-12T21%3A23%3A59.144679Z)):

> Why is Claude 4.8, Gemini 3.1, GPT-5.4, and GPT-5.5 all within 4 total points out of ~80?
> They are *way* too close together. This looks like all the models are actually saturating
> the benchmark and livebench is just wrong on the answer key for ~20% of the questions.

> Ngl opinion on Livebench has degraded quite a bit when their numbers are off like every
> other model drop (and I mean they fix the numbers a few days later, not just "this
> benchmark doesn't fit with my vibes").
>
> u/FateOfMuffins, 24 points

> Livebench is a notoriously sloppy benchmark. If you wanna look at a professional aggregate
> benchmark then checkout epochs ECI.

> i don't think this benchmark has been relevant since a long time, id take it w a grain of
> salt, i think artificial analysis is a better bench

This is not new. On HN nine months earlier:

> livebench was good, but now it's a joke. Gemini flash is better in coding than pro and
> sonnet 3.7. And this is only the beginning of weird results.
>
> ribelo, [HN 44121788](https://news.ycombinator.com/item?id=44121788)

The repo itself is alive ([LiveBench/LiveBench](https://github.com/livebench/LiveBench),
1,299 stars, pushed 2026-08-29) and there is no single-file leaderboard CSV; you fetch it
with their `download_leaderboard.py` script or parse HF datasets. **Rule this out.** Active
maintenance did not save its reputation.

### On Artificial Analysis, from people picking models

> Seems like you're asking for the Artificial Analysis "Intelligence vs Cost" benchmark,
> perhaps?
>
> SyneRyder, [HN 48837396](https://news.ycombinator.com/item?id=48837396)

> Not perfect, but I find the artificialanalysis.ai "Intelligence vs. Output Tokens Used in
> Artificial Analysis Intelligence Index" chart to be of great use. A proper evaluation needs
> to compare 3 things together: score, speed, and verbosity.
>
> [HN 48147962](https://news.ycombinator.com/item?id=48147962)

The recurring shape of the endorsement matters for pickai: people reach for AA specifically
when they want *quality traded against cost or speed*, which is exactly what pickai's
scoring model does.

---

## 4. Reputation problems, by source

### Artificial Analysis

The one substantive charge is index reweighting that moved an open-weight model off the top.
From a June 2026 r/LocalLLaMA post
([mirror](https://bittide.aicompass.dev/article/a37950ec-1a18-47c4-819d-7ab56c879ce1),
[cluster](https://pulseaugur.com/cluster/186970-user-alleges-bias-in-ai-intelligence-index-favoring-anthropic)):

> I swear AA is not the bipartisan they so claim. An open source mode (Qwen 3.8 max) was
> number 1 on the agentic index, then they just so happen to launch "v4.1.1" of their index in
> which they just adjusted the weights of the gdpval and t3 banking so that it would be lower
> than opus ... Highly likely to be paid off imo.

I could not corroborate the payment allegation and treat it as unsupported. But the
underlying mechanic is real and is documented by AA themselves: the
[Data API docs](https://artificialanalysis.ai/data-api/docs) state that minor version bumps
"may include changes to contributing evaluations, task subsets, graders, scoring/normalization,
weightings, anchors" and that "Scores may or may not change." **A composite index whose
weights can move under you is a genuine engineering hazard for a library that caches scores.**
AA at least versions it: current version v4.1.1, composed of 9 evaluations (GDPval-AA v2,
tau3-Banking, Terminal-Bench v2.1, SciCode, AA-LCR, AA-Omniscience, HLE, GPQA Diamond, CritPt).

On independence: AA's [about page](https://artificialanalysis.ai/about) lists angel backers
(Nat Friedman, Daniel Gross, Andrew Ng, Adam D'Angelo, Clem Delangue, Guillermo Rauch, swyx)
rather than labs, and the page leans on lab endorsements as social proof. I found no
disclosure either way on whether labs pay them.

### LMArena / Arena.ai

Two distinct problems, one old and one new.

**The methodology problem** is [The Leaderboard
Illusion](https://arxiv.org/abs/2504.20879) (Cohere Labs, AI2, Princeton, Stanford, Waterloo,
UW). Simon Willison's [summary](https://simonwillison.net/2025/Apr/30/criticism-of-the-chatbot-arena/)
quotes the abstract:

> We find that undisclosed private testing practices benefit a handful of providers who are
> able to test multiple variants before public release and retract scores if desired. ... At
> an extreme, we identify 27 private LLM variants tested by Meta in the lead-up to the
> Llama-4 release.

and adds the criticisms that matter for open-weight coverage specifically:

> Unfair sampling rates: a small number of proprietary vendors (most notably Google and
> OpenAI) have their models randomly selected in a much higher number of contests. ... Unfair
> removal rates: "We find deprecation disproportionately impacts open-weight and open-source
> models"

Arena [responded](https://arena.ai/blog/our-response/) and tightened policy.

**The newer, structural problem** is that Arena became a vendor to the labs it ranks.
It [raised $150M at a $1.7B valuation in January 2026](https://techcrunch.com/2026/01/06/lmarena-lands-1-7b-valuation-four-months-after-launching-its-product/)
and [reached $100M annualized revenue by June 2026](https://arena.ai/blog/arena-100m-revenue).
As [one write-up](https://startupfortune.com/arena-hit-100m-in-annualized-revenue-by-letting-ai-companies-pay-to-be-evaluated-and-that-is-exactly-the-problem/) puts it:

> Its paying customers include AI companies whose models appear on the leaderboard. ... When
> companies like that depend on a ranking and can also pay for evaluation products connected
> to the same ecosystem, Arena has to do more than say the teams are independent.

### SWE-bench Verified: confirmed dead as a frontier signal

OpenAI's [own post, 2026-02-23](https://openai.com/index/why-we-no-longer-evaluate-swe-bench-verified/)
is unusually blunt and gives two independent reasons:

> We audited a 27.6% subset of the dataset that models often failed to solve and found that
> at least 59.4% of the audited problems have flawed test cases that reject functionally
> correct submissions
>
> ... all frontier models we tested were able to reproduce the original, human-written bug fix
> used as the ground-truth reference, known as the gold patch, or verbatim problem statement
> specifics for certain tasks
>
> This is why we have stopped reporting SWE-bench Verified scores, and we recommend that other
> model developers do so too.

### Terminal-Bench: submission gaming

Terminal-Bench v2 is in AA's index and in Epoch's hub, so this is worth knowing:

> There are also a lot of fake results out there on Terminal Bench 2 for different reasons
> (although the great team behind it Ryan/Alex et al, recently cleaned up a lot of dodgy
> submissions). A lot of labs publish the results by modifying timeouts or hardware config
> which effectively bypasses what is being tested in certain tasks.
>
> GodelNumbering, [HN 48838212](https://news.ycombinator.com/item?id=48837396)

### Epoch AI's ECI: scrutinised, flawed, and honest about it

This is the only source where I found an independent third party attempt a **full
replication**. Statistical consultant Alexander Barry
[replicated the ECI from Epoch's published data and code](https://abstatisticalconsulting.substack.com/p/kicking-the-tires-of-the-epoch-capabilities)
and found a real defect:

> Note the way they combined models conflicts with their claim that they only aggregate
> together models with the same release date, as 24/144 of the sets of aggregated LLMs ...
> contain LLMs with different release dates ... Gemini 1.5 Pro is given release date
> 2024-05-24, despite all of its benchmark results that contribute to the ECI coming from the
> 002 release launched on 2024-09-24. ... **Epoch have confirmed this is a mistake in how the
> LLMs are aggregated and they will correct it in an update.**

That is the single best trust signal I found for any source in this survey: published method
([A Rosetta Stone for AI Benchmarks](https://arxiv.org/html/2512.00193v1), with DeepMind),
published code, an outsider reproducing it, finding a bug, and the maintainer conceding it.
The same reviewer notes the live benchmark list on the website was outdated, which is a
freshness caveat, not an integrity one.

---

## 5. LMArena in 2026, specifically

**Do practitioners still use it? Yes, but for a narrowed purpose, and rarely as the deciding
input.** The clearest statement of what it is now good for, and what it is not:

> I generally rely on LMArena for this: https://arena.ai/leaderboard/code/webdev/pareto
>
> LMArena's "code" leaderboard is really skewed since it's a front-end JS code and design
> leaderboard. It generates a demo app with two models and then asks "do you prefer A or B".
> People can look at the code, but most of the time it's just going to be which one looks
> nicer. Models that people like the design aesthetic of (Claude, GLM) tend to do better in
> LMArena than they do on other benchmarks. ... I'm not saying that the LMArena leaderboard
> isn't useful, but I'm not sure how much weight I'd give it as a "code" leaderboard.
>
> [HN 48936322](https://news.ycombinator.com/item?id=48936322)

**Has something displaced it as the default free option? Mechanically, yes: Artificial
Analysis, via OpenRouter.** A developer picking a model today is more likely to encounter AA
numbers on an OpenRouter model page than to open arena.ai.

**But LMArena's data access got dramatically better in April 2026**, and this cuts against
writing it off on mechanics. Arena
[released its full leaderboard history](https://arena.ai/blog/arena-leaderboard-dataset) as a
Hugging Face dataset:

> today we're releasing the entire history of those leaderboards as a public-access dataset

Verified specifics: [lmarena-ai/leaderboard-dataset](https://huggingface.co/datasets/lmarena-ai/leaderboard-dataset),
CC-BY-4.0, 2,251,197 rows, 112 MB, 26,456 downloads last month, last modified 2026-08-28.
It has 14+ subsets including `text_style_control` (the style-corrected variant is a separate
subset, so pickai could use the corrected numbers by default), `webdev`, and `agent`. Each row
carries `model_name, organization, license, rating, rating_lower, rating_upper, variance,
vote_count, rank, category, leaderboard_publish_date`. The Hugging Face rows API serves it
**without a key** (verified). They also open-sourced the ranking method as
[`lmarena/arena-rank`](https://github.com/lmarena/arena-rank) (113 stars).

So the 2026 verdict on LMArena is: **easiest and cleanest data access of any candidate,
weakest reputation among the developers pickai serves.** Confidence intervals per model and
a per-category breakdown are genuinely attractive for a scoring library. The problem is what
the number means, not how to get it.

---

## 6. Access and licensing, side by side

| | Artificial Analysis | AA via OpenRouter | Arena (LMArena) | Epoch AI hub |
| --- | --- | --- | --- | --- |
| Endpoint | `artificialanalysis.ai/api/v2/language/models/free` | `openrouter.ai/api/v1/models` | HF `lmarena-ai/leaderboard-dataset` | `epoch.ai/data/benchmark_data.zip` |
| Key required | **Yes** (`x-api-key`) | **No** (verified) | **No** (verified) | **No** (verified) |
| Rate limit | 100 req / 24h fixed window (free tier) | Unstated on `/models`; `/benchmarks` is 30/min, 500/day | HF limits | None |
| Licence | Attribution required all tiers; "For redistribution rights ... contact the team" | Unresolved (see caveats) | CC-BY-4.0 | CC-BY-4.0 |
| Payload | intelligence/coding/agentic indices, median perf, in/out pricing | Same three indices, plus Design Arena ELO | Bradley-Terry rating + CI + vote counts, per category, full history | ~80 CSVs, 474 KB zip, incl. `epoch_capabilities_index.csv` (867 rows) |
| Coverage today | 500+ models claimed | 165 of 396 OpenRouter models | 2.25M historical rows | 37 benchmarks in ECI; hub is broader |
| Freshness | Continuous | Continuous | Updated 2026-08-28 | Updated 2026-08-28 |

Two licensing notes that matter for an MIT-licensed npm package:

1. **AA's free tier requires a key.** For a zero-dependency, zero-config library this is real
   friction: every pickai user would need to sign up. The 100 req/24h cap is per
   user-or-organization scope, not per key, so it does not survive being called from a
   library at runtime. It works if the consumer caches, as omi does.
2. **AA's terms require attribution and reserve redistribution.** From the
   [docs](https://artificialanalysis.ai/data-api/docs): "Use of the API requires attribution
   across all tiers. ... For redistribution rights or bespoke contract terms, contact the
   team." pickai **vendoring** AA scores into the package would need their sign-off. pickai
   *fetching* them at runtime with an attribution notice would not.
3. **Epoch and Arena are both CC-BY-4.0, which permits vendoring with credit.** Epoch's
   [licensing page](https://epoch.ai/benchmarks/use-this-data) also flags that Aider Polyglot
   and Terminal-Bench derived rows carry Apache 2.0 and need separate credit.

---

## 7. What this implies for pickai

- The identity-join problem is unavoidable and differs per source. Epoch keys on a
  `Model version` string like `claude-fable-5_high` / `gpt-5.5-pro_xhigh`, which encodes
  reasoning effort and does not match models.dev IDs. Arena keys on `model_name` like
  `claude-opus-4-6-high`. **Design Arena is the only source that publishes an
  `openRouterId` explicitly for cross-referencing**, and AA-via-OpenRouter is already joined
  to OpenRouter IDs by construction. If pickai wants the cheapest join, the OpenRouter route
  is the one where somebody else already did the mapping.
- Every candidate has a composite index that can be reweighted without notice (AA v4.1.1,
  Epoch ECI). Any cached score needs a version stamp, and pickai's existing "missing data is
  uncovered, not 0" discipline should extend to "stale index version is uncovered."
- The evidence does not support a single obvious winner. It supports a clean trade:
  **AA-via-OpenRouter for adoption and zero-friction access, Epoch for licence clarity and
  reputation.** The decision hinges on whether pickai is willing to depend on OpenRouter as a
  conduit and to resolve the redistribution question, or would rather vendor a CC-BY dataset
  it can ship in the package.
