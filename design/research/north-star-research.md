# pickai v3 North Star

Grounded in six research sweeps and one skeptic pass. Every substantive claim below traces to a verified finding. Where researchers disagreed, the disagreement is stated rather than averaged.

## 1. What people are actually trying to do

The job is not "find the best model." It is **produce a defensible shortlist I can test, under constraints I do not control.**

Three things sit underneath every surface question in the evidence.

**First, the decision is a constrained optimization, not a ranking.** The single most repeated pattern across Hacker News is "the cheapest model that passes my evals": price is the objective, task quality is the binding constraint. Four independent comments say it almost identically, including ["You'd then go down to the cheapest model that can solve the evals"](https://news.ycombinator.com/item?id=48313342) and ["I'd previously been obsessed with 'best/smartest model', and suddenly realized what I actually wanted was 'fastest/dumbest/cheapest model that can handle my task!'"](https://news.ycombinator.com/item?id=48313342). GitHub's published evaluation framework formalizes the same shape and warns against collapsing it: it separates a [primary outcome, a safety constraint, and operational guardrails](https://github.blog/ai-and-ml/llms/how-to-evaluate-llms-before-production/) and says explicitly that treating those as interchangeable produced wrong calls.

**Second, the quality floor is a property of the user's task, and they know it.** ["It's really hard to say what model is 'generally' better then another... the only way to find that out is by having a private benchmark you run yourself"](https://news.ycombinator.com/item?id=44723712). And quality attaches to the model-and-prompt pair, not the model: ["a prompt could yield a great response from Claude, but the same prompt could yield a mediocre response from Gemini"](https://news.ycombinator.com/item?id=47319587). Hex, whose whole post is about evals, calls swapping the model string ["just step 0 in an infinitely-long process"](https://hex.tech/blog/im-sorry-but-those-are-vanity-evals/).

**Third, a large share of these decisions are not greenfield.** They are forced. A documented production migration was triggered by [a retirement date plus latency degradation on the incumbent](https://www.ellamind.com/blog/gpt-4o-to-gpt-5-6-migration), with no candidate comparison at all: the model was chosen for them and the work was proving the swap safe. OpenAI shut down [roughly 30 models in one notice on three to six months' notice](https://community.openai.com/t/deprecation-notice-upcoming-model-shutdowns-in-2026/1379553/6), including models released that same year. The loudest temporal question in the whole corpus is availability, not novelty: ["Please Don't Deprecate GPT-Realtime Before a True Replacement Exists"](https://community.openai.com/t/please-dont-deprecate-gpt-realtime-before-a-true-replacement-exists/1387635).

So the job is: **narrow thousands of models to a handful I am allowed to use and can afford, so I can run my own test and defend the answer.** pickai's docs claim the terminal step ("use this one"). The evidence says the terminal step belongs to the user's eval, and the valuable step is the one before it.

## 2. The questions people actually ask

Ranked by how often they appeared across the six sweeps.

**Tier 1: is it good enough, and how would I know.** Appeared in every sweep.
- ["Is there some definitive way to say a model is good enough for a task? Or is it all vibes?"](https://news.ycombinator.com/item?id=48096861)
- ["how are companies running internal AI evals to determine which model is best for their use case?"](https://news.ycombinator.com/item?id=47319587)
- ["how do you personally evaluate new LLM models? Vibes? Or do you have some tests you like to run?"](https://news.ycombinator.com/item?id=44780721)
- ["then how do you choose your minimum acceptable threshold (is 95% accuracy good enough? is 90%?)"](https://news.ycombinator.com/item?id=47347429)

**Tier 2: can I step down a tier without getting burned.** The cost question in its real form.
- ["Right now I use Opus for planning and harder tasks and switch to sonnet for more defined tasks. But I feel like sonnet is kind of stupid"](https://news.ycombinator.com/item?id=48096861)
- ["My problem is anytime I step down the results are subtlely worse and sometimes I don't notice immediately"](https://news.ycombinator.com/item?id=48096861)
- ["only Sonnet is really good enough for our use case, but its expensive!"](https://news.ycombinator.com/item?id=47617915)
- ["I got frustrated paying $60/M tokens for reasoning queries when a $0.80/M model gives comparable results for most of them"](https://news.ycombinator.com/item?id=47036011)
- Notion's version, measured: extra intelligence is often a ["capability overhang"](https://www.baseten.co/blog/how-to-choose-a-model-lessons-from-notion-and-gamma/) with no measurable quality difference on triage, summarization, or page editing.

**Tier 3: what will this actually cost me.** Repeatedly stated as cost per task, never per token.
- ["PPT (price-per-token) is insufficient to compute cost... A .01x PPT is wiped out by 100x TPI"](https://news.ycombinator.com/item?id=45095811)
- ["Its shocking how cost per token does not correlate with cost per task"](https://news.ycombinator.com/item?id=48846351)
- ["I can't predict what a feature will cost until I've already built it and run it at some scale... a single user action might be 3 API calls or 40"](https://news.ycombinator.com/item?id=47237134)
- ["How do you handle prompt caching? A lot of cost savings for a single model chat come from cache hits... switching models invalidates that cache"](https://news.ycombinator.com/item?id=48783372)

**Tier 4: am I even allowed to use it.** Fewer verbatim quotes, but decisive where it appears, and it is the one gate that returns a set of size one.
- ["GDPR requires the data to stay in the region. In those cases, we cannot use the Deepseek"](https://arxiv.org/html/2607.16660v1) and, from the same participant, Gemini ["was the only option that met the data residency requirement"](https://arxiv.org/html/2607.16660v1).
- ["We used Copilot for that because we have Copilot's license. Otherwise, we could have gone with other models."](https://arxiv.org/html/2607.16660v1)

**Tier 5: is it going away, and does the replacement replace it.**
- ["Clarification needed: Is only gpt-5-mini-2025-08-07 deprecated, or the entire gpt-5-mini family?"](https://community.openai.com/t/deprecation-notice-upcoming-model-shutdowns-in-2026/1379553/6)
- ["`gpt-4-turbo` appears in the list, but it is an alias to `gpt-4-turbo-2024-04-09` that does NOT appear"](https://community.openai.com/t/deprecation-notice-upcoming-model-shutdowns-in-2026/1379553/6)
- A verified alias regression: the pinned snapshot was fine, the undated alias ["shows noticeably worse language quality and worse faithfulness"](https://community.openai.com/t/realtime-regression-in-non-english-production-voice-agents-gpt-realtime-mini-vs-gpt-realtime-mini-2025-10-06/1380643).

**Tier 6: will the capabilities actually work.** Booleans that lie.
- Tool calling: ["`meta.llama3-3-70b-instruct-v1:0` when served via Amazon Bedrock has `tool_call = true` in models.dev, but exhibits documented provider-level failures"](https://github.com/anomalyco/models.dev/issues/342), which is ["forcing consumer libraries to maintain their own local override lists."](https://github.com/anomalyco/models.dev/issues/342)
- Structured output: ["All three Claude models accepted `response_format` with a JSON Schema, returned 200, and then wrote whatever JSON they liked: zero of 60 battery responses matched the schema."](https://synthorai.io/blog/llm-structured-outputs/)
- Vision: the `attachment` flag [contradicts `modalities.input` in 289 catalog entries](https://github.com/anomalyco/models.dev/issues/5792), surfacing downstream as "vision model cannot see images."

**Tier 7: latency and operational limits.** Real, widely implemented, rarely asked as a question in these corpora.
- ["How Do I Fail Over When a Provider Is Slow, Not Just Down?"](https://vercel.com/academy/ai-gateway/latency-failover)
- ["if I know upfront that model X only allows 60 requests/minute but model Y allows 1000/minute, I can architect accordingly"](https://github.com/anomalyco/models.dev/issues/204), open for eleven months with no maintainer reply.

**Tier 8: knowledge cutoff.** Present, but the framing matters. One researcher claimed nobody asks; the skeptic refuted that and found ["Do knowledge cutoff dates matter anymore?... is the knowledge cutoff date still any kind of relevant factor?"](https://news.ycombinator.com/item?id=44272951). The accepted answer in those threads is to use retrieval, not a newer model. Nothing in any sweep supports ranking by release date.

## 3. What answers those questions today, and what does not

**Bucket A: answerable from catalog metadata. This is the smallest bucket, and it is almost entirely eligibility, not ranking.**

Hard API limits are real: you cannot exceed a context window, and a model either accepts images or does not. Modality and open-weights filters are market-validated, not catalog leftovers: pricepertoken.com's shipped filter chips are ["Tool Use 360, Vision 184, Reasoning 126, Web Search 93, PDF Input 87, Caching 178, Audio In 20, Open Source 283"](https://pricepertoken.com/). List price is a genuine fact, subject to the caveats below. That is the honest extent of it. Four of pickai's five scoring criteria are [literal models.dev table columns](https://models.dev/), and the fifth is a models.dev JSON field.

Worse, parts of this bucket are actively wrong. Prices can be [90%-off promotions recorded as standing rates, affecting 20 of 350 OpenRouter models](https://github.com/anomalyco/models.dev/issues/4580). Per-image and per-second models [end up with `cost: {}`, so "a dollar cap silently becomes no cap on exactly the models that report no price"](https://github.com/anomalyco/models.dev/issues/5311). And `minOutput` filters on a model-level number that is not true of the thing you buy: querying the live OpenRouter endpoints API, `openai/gpt-oss-120b` ships with [`max_completion_tokens` from 8,192 to 117,964 depending on endpoint](https://openrouter.ai/api/v1/models/openai/gpt-oss-120b/endpoints).

**Bucket B: answerable only from data pickai does not have. This is the biggest bucket by far.**

Quality on any named benchmark. Cost per task, which requires a verbosity or reasoning-token number: Artificial Analysis publishes [cost per task from $0.04 to $1.78 and time per task from 1.5 to 13.5 minutes](https://artificialanalysis.ai/articles/artificial-analysis-intelligence-index-v4-1), and notes Sonnet 4.6 takes longer per task than Opus 4.8 because it emits more tokens. Latency, as two numbers bucketed by request size over a [rolling one-hour window](https://docs.requesty.ai/features/latency-routing). Tool-call reliability as a continuous number: OpenRouter has [scored billions of tool calls and cut GLM-5's error rate by 88%, from ~8% to ~1%](https://openrouter.ai/blog/announcements/auto-exacto/). Adoption per task type, available today under [CC BY 4.0 with a task_type filter](https://openrouter.ai/docs/cookbook/administration/data-api). Data-retention and residency policy: an org on zero data retention [must turn retention on to call Anthropic's covered models at all](https://support.claude.com/en/articles/15425996-data-retention-practices-for-covered-models). Retirement dates and successor pointers. Rate limits, which are per-account-tier and may have no realistic path to a catalog at all.

**Bucket C: not answerable by any tool, because it requires the user's own task.**

Whether the model is good enough. Whether stepping down is safe. Whether your prompts survive the swap. This bucket contains the Tier 1 and Tier 2 questions, which are the most-asked questions in the entire corpus. Practitioners say the substitute is a private benchmark and, notably, that they ["Just don't share this benchmark publicly once you're using it for measurements"](https://news.ycombinator.com/item?id=45857280). That norm means crowd-sourced quality data will stay thin, and it means pickai should not try to become the probe.

Blunt summary: the biggest bucket by question count is C, the biggest by addressable-data volume is B, and A is small and partly unreliable. **pickai currently scores exclusively on A.**

## 4. Verdict on our hypothesis

**Confirmed for the scoring criteria, strongly. Refuted for the filters.** Do not average these into a single verdict; they point at different fixes.

On scoring, the evidence is about as direct as research gets. Four of five criteria are models.dev columns and the fifth is a models.dev field. More damning: a third party with no connection to pickai independently proposed [the same scoring model inside the models.dev repo](https://github.com/anomalyco/models.dev/issues/1893), reasoning from exactly the same starting point ("models.dev already exposes every fact needed to rank models objectively"), and then stated the limitation unprompted under a heading called *Honest limitation*: "The catalog has no quality/benchmark field, so this measures spec-breadth-per-dollar, not model intelligence." Two people, working independently from the same catalog, produced the same axes. That is what inheritance looks like.

Meanwhile every product that holds measured quality data leads with it: [Artificial Analysis](https://artificialanalysis.ai/leaderboards/models) default-sorts Intelligence Index, [llm-stats](https://llm-stats.com/) leads with a composite, [LMArena](https://lmarena.ai/leaderboard) orders by Overall. pickai's Quality profile is `recency(5) + knowledgeFreshness(3) + contextCapacity(2) + outputCapacity(2) + costEfficiency(1)`. That is not a quality profile. It is a newness-and-spec-breadth profile wearing the word Quality.

Two criteria are worse than merely inherited, they are pointed the wrong way. Advertised context is distrusted by the products that publish it: llm-stats' own FAQ tells users to consult per-model ["effective context" notes because "providers vary in how well they actually use the upper end of their advertised windows"](https://llm-stats.com/), and a peer-reviewed ICML 2025 result found that [at 32K tokens, 11 of 13 models claiming 128K+ drop below 50% of their short-context baseline](https://proceedings.mlr.press/v267/modarressi25a.html). Ranking higher advertised context rewards the loosest claim. And `costEfficiency` reads only `cost.input`, ignoring output price and cache-read price, when Artificial Analysis weights [cache hits at 70% in its blended price](https://artificialanalysis.ai/methodology).

On the filters, the hypothesis is refuted. Reasoning, tool call, open weights, modality and price ceilings are all shipped, market-validated filter chips on competing products. Regulated buyers filter first and rank later, sometimes down to a single candidate. The declarative-filter half of pickai is the right idea. It has the wrong *set* of fields (missing residency, retention, license, lifecycle date) and two fields that read contradictory catalog data, but the shape is right.

## 5. What this means for the library

**Does a general quality signal belong in the core? No. A quality *adapter* does.**

The evidence against a pickai-computed quality number is overwhelming and comes from the people whose opinion matters most. Karpathy declared his ["general apathy and loss of trust in benchmarks in 2025... Training on the test set is a new art form"](https://karpathy.bearblog.dev/year-in-review-2025/). OpenAI [stopped reporting SWE-bench Verified and told other labs to stop too](https://openai.com/index/why-we-no-longer-evaluate-swe-bench-verified/), having found at least 59.4% of an audited subset had flawed tests. A 60-benchmark study found [nearly half saturated, with private test sets showing no protective effect](https://arxiv.org/html/2602.16763v1). Arena Elo is structurally biased against exactly the open-weight models pickai gives a first-class filter: [83 open-weight models received an estimated 29.7% of arena data while Google and OpenAI got ~19% and ~20% each](https://arxiv.org/html/2504.20879v1), and the arena operators themselves showed [rank was substantially a length-and-markdown artifact](https://www.lmsys.org/blog/2024-08-28-style-control/). The one leaderboard built purely on benchmark accuracy [shut itself down because a fixed axis set goes stale](https://huggingface.co/spaces/open-llm-leaderboard/open_llm_leaderboard/discussions/1135).

Surface the disagreement honestly: there is decent evidence a general quality factor *exists*. Hardt et al. found that after equal task-specific fine-tuning, [rankings become consistent and the model-score matrix collapses to essentially rank one](https://arxiv.org/abs/2507.05195). But that is model *potential* after tuning, which is not the situation a chooser is in. The counter-evidence that public out-of-the-box scores do not induce a stable ranking comes from [a paper reporting 22% of model pairs inverting across benchmarks](https://kdd-eval-workshop.github.io/agenticai-evaluation-kdd2026/assets/papers/48_Construct_Validity_Failures%20(1).pdf), which the skeptic flags as a single-author high-school workshop submission over 5 benchmarks. Weight the argument, not the paper. The defensible conclusion: a latent quality factor may exist, and pickai has no honest way to read it, so it should not pretend to.

What to build instead: a first-class, typed, **attributed** quality adapter. Named source, version, date, and the components it blends, all visible in the API surface and in any explanation the UI renders. Artificial Analysis proves the shape works commercially: its index is [an explicitly weighted, reweightable, versioned composite (Agents 34%, Coding 24%, Scientific Reasoning 24%, General 18%)](https://artificialanalysis.ai/methodology/intelligence-benchmarking), structurally identical to pickai's weighted-criteria model. Wiring AA components in as criteria costs almost no API change. OpenRouter's [task-typed benchmark feed is CC BY 4.0 and gated only by an API key most pickai users already have](https://openrouter.ai/docs/cookbook/administration/data-api). "Benchmarks are bring-your-own-data" was defensible when benchmark data had no machine-readable home. It no longer does.

But keep BYOD as the *primary* path, not the escape hatch. It is currently the most important input in the library and the least supported path in the API. Rejection reasons people name out loud include [verbosity ("The more verbose a model is, the less I want to use it"), over-defensiveness, and non-English competence](https://arxiv.org/html/2607.16660v1). Those are BYOD-shaped forever.

**Is min-max scoring relative to the candidate set right? No. It is the deepest design error in v2.**

Four independent problems. First, every score is meaningless in isolation and changes when the candidate set changes, which makes "why it placed where it did" unexplainable in absolute terms and makes the UI's live-updating ranking silently reshuffle for reasons unrelated to the model. Second, it converts unknowns into numbers: a `cost: {}` model normalizes as best-in-class free, and a promotional $0.03 rate tops every Cheap recommendation. Third, it linearly blends axes that are not interchangeable, which is exactly what [GitHub says caused wrong calls](https://github.blog/ai-and-ml/llms/how-to-evaluate-llms-before-production/): "A change that reduced false positives but significantly lowered recall wasn't automatically an improvement." Fourth, it models the decision as maximize-a-sum when practitioners describe it as minimize-cost-subject-to-a-floor.

Replace it with three tiers that match how the decision is actually made:
1. **Eligibility gates** (hard, absolute, non-negotiable): residency, retention policy, license held, context fits, modality required, not retiring before my horizon.
2. **Thresholds at a percentile** where telemetry exists. OpenRouter expresses latency and throughput as [`preferred_min_throughput` / `preferred_max_latency` with p50/p75/p90/p99 cutoffs](https://openrouter.ai/docs/guides/routing/provider-selection), not as scores to maximize. That is the right shape: constraint, not criterion.
3. **A small number of interpretable derived numbers** for the final ordering, computed on absolute units, not normalized ranks. Cost per task at the user's token shape is the obvious first one. "Cost per intelligence" is what [an experienced practitioner reached for when building this from scratch](https://github.com/tkellogg/model-selection).

Min-max should survive only as an opt-in helper (`minMaxCriterion` already exists), never as the default behavior of the built-in criteria.

**Is "narrow a catalog then rank" the right premise? The narrow is right. The rank is where it breaks, and the entry point is wrong more often than we assumed.**

Evidence for the narrow: regulated buyers narrow to one. OpenRouter tells developers to ["Use leaderboards to shortlist, then verify on your own prompts"](https://openrouter.ai/blog/insights/evaluate-llm-provider-performance/). aicost.ai's own marketing describes narrowing ["150+ models to the 5-10 worth comparing"](https://aicost.ai/ai-model-finder) and then, honestly, "Treat this as discovery only."

Evidence against ranking-as-the-deliverable: on an Ask HN thread specifically about choosing models per task, [no respondent enumerated or filtered a catalog](https://news.ycombinator.com/item?id=48096861). The artifacts people maintain are small hand-written routing tables over two to five models. Ramp's production gateway [takes the model choice as an input, a caller-supplied preference order](https://engineering.ramp.com/post/thompson-sampling-model-routing), and resolves it at request time. The developer who did benchmark eight models [shipped ordered fallback chains per pricing tier](https://dev.to/shanni/i-benchmarked-8-llms-for-a-niche-production-app-the-flagship-was-16x-the-cost-for-nothing-246e), not a single pick.

So: **the deliverable should be an ordered, small, explained candidate set with a fallback chain, not a rank-1 answer.** And pickai should explicitly refuse to become a runtime router. A gateway that shipped one deprecated it after four months and 7,000 users, saying ["We don't believe in model routing anymore"](https://manifest.build/blog/why-we-deprecated-our-llm-router/) and "Complexity cannot be deduced from the prompt alone." An ACL 2026 benchmark over 400K instances found [several commercial routers "fail to reliably outperform a simple baseline"](https://aclanthology.org/2026.findings-acl.1881/). Deliberate up-front selection is a different and better-defended position.

**One structural question to settle before anything else: is the unit of selection a model, or a model-and-endpoint?** The evidence says quality, latency, output limit and even context vary by endpoint severely enough to have [invalidated a NeurIPS paper, whose author conceded it](https://www.lesswrong.com/posts/KsyoSAyBRXtwzSugg/not-pinning-your-openrouter-provider-might-invalidate-your). ["The same weights served by different platforms, with different optimizations, produce different quality at scale. Evaluate the provider, not just the model."](https://www.baseten.co/blog/how-to-choose-a-model-lessons-from-notion-and-gamma/) My recommendation: **stay at model level, and say so out loud.** Endpoint selection is a routing problem, and pickai should not become a router. But `minOutput` and `minContext` as currently implemented are a correctness bug on open-weight models, and `providers`/`excludeProviders` is a naming filter dressed as a selection axis. Both need honest labels.

**Concrete API changes.**

Drop as scoring criteria: `contextCapacity`, `outputCapacity`, `recency`. Keep context and output as threshold filters only. Keep `knowledgeFreshness` as a low-weight tiebreaker, which is what the evidence supports and no more.

Rework `costEfficiency` into a cost model that takes a workload shape. The closest analogue to `recommend()` already does exactly this: [`estimated_input_tokens`, `estimated_output_tokens`, `budget_per_call`, and a `volume` object returning monthly projections](https://github.com/Which-Model/whichmodel-mcp). `maxCostInput` / `maxCostOutput` as $/M ceilings are numbers nobody can reason about without a token volume.

Read the cache fields. `src/source.ts` already parses `cache_read`/`cache_write` into `ModelCost`, and nothing in `src/` reads them. Vercel's gateway makes [`implicit-caching` its only model-capability filter](https://vercel.com/docs/ai-gateway/models-and-providers/model-filtering). This is the cheapest correctness win available and needs no new data source.

Treat unknown as unknown. `cost: {}` must not score as free. `criterionCoverage` already exists on the branch; make it load-bearing rather than reportable.

Fix the contradictory fields. Derive `attachment` from `modalities.input`, or drop `attachment` entirely. Two filters over data that disagree on 289 entries can return contradictory candidate sets for the same intent.

Make booleans tri-state or overridable. `toolCall: true` on a model that 400s in production is worse than no filter, and the upstream issue names consumer libraries maintaining override lists as the current workaround.

Expand lifecycle from one boolean to a state plus a date plus a successor. Anthropic publishes [four states and a "Tentative retirement date" column](https://platform.claude.com/docs/en/about-claude/model-deprecations), and notes partner platforms set their own schedules. modelpedia already carries a per-model [`successor` pointer](https://github.com/assistant-ui/modelpedia/blob/main/packages/npm/README.md); llm-info carries `legacy`, `legacyReason`, and a deprecated-ID mapping table.

Add eligibility gates for policy: data retention, residency region, license. These are static facts, not telemetry, so "we have no measurements" is not an excuse for omitting them.

**Which new data is worth sourcing.** Yes to a benchmark adapter (AA and OpenRouter, both free-tier accessible, both attributable and dated). Yes to lifecycle and successor data (modelpedia is daily-refreshed, though its 17 weekly npm downloads mean nobody else is using it for this). Yes to adoption-per-task-type, **labeled adoption, never quality**, because OpenRouter itself states on the same page that ["These rankings measure adoption, not quality"](https://openrouter.ai/rankings). No to latency and throughput telemetry: it is a live feed with a rolling window, it belongs to endpoints rather than models, and consuming it would end pickai's zero-dependency, static-catalog character for an axis that is a routing concern.

## 6. What this means for the web app

**Primary input: a description of the workload, not a set of weight sliders.** Concretely: what the task is, roughly how many input and output tokens per call, roughly how many calls per day, and any hard rules (region, retention, providers you are allowed to use). Weight sliders ask the user to express a preference over axes they do not trust; a workload shape asks for facts they already have. OpenRouter's own chooser classifies the prompt into [one of ~30 task types](https://openrouter.ai/docs/guides/routing/routers/auto-router) rather than asking for preferences.

**Screen one: eligibility, stated as elimination.** Show the count collapsing and name every gate that fired. "1,847 models. Your EU residency rule removes 1,203. Your zero-retention policy removes 41 more, including Claude's covered models. 603 remain." This is the part pickai is genuinely best at, and it is the part regulated buyers do first.

**Screen two: the shortlist, three to seven candidates, with a projected bill.** Not a rank-1 answer. Show cost per task at *their* token shape and their stated cache hit rate, not $/M tokens. Show the quality signal with its source and date attached, or show explicitly that there is none. Show lifecycle: state, retirement date if known, successor if known.

**Screen three: why it placed where it did, with provenance, and with limits stated.** Each contributing factor gets a label saying what kind of fact it is: a hard API limit, a posted price (with a flag if the catalog shows signs of a promotional rate), a third-party benchmark with a name and date, or adoption data. The explanation must be honest about what it is not: it explains a ranking over specs and third-party measurements, never a prediction about behavior on the user's task. Two catalog entries identical on every field [can behave differently in production](https://community.openai.com/t/realtime-regression-in-non-english-production-voice-agents-gpt-realtime-mini-vs-gpt-realtime-mini-2025-10-06/1380643), and the app should say so rather than manufacture confidence.

**A "we deliberately do not answer this" panel.** Rate limits (per-account tier, not per-model). Whether it is good enough for your task. Endpoint-level latency and quantization. Telling someone a question is out of scope beats letting them believe the cost filter answered it. This is also the most credible thing on the page, given how much of the audience distrusts confident rankings.

**What the user takes away, in priority order.** (1) A shortlist of three to seven models to test, plus a suggested ordered fallback chain, because that is the artifact people actually maintain. (2) The pickai code that produced it, which is the product's whole thesis. (3) A scaffold for running their own eval over that shortlist, since the binding constraint lives in bucket C and nothing else can close it. If the app ends at "here is a ranked list," it has shipped the step everyone in the evidence says is worthless in isolation.

**Regression test, borrowed from the models.dev proposal that predicted our failure mode:** if the chooser surfaces a cheap omni-modal auto-router as the top quality pick, the axes are the problem, not the weights.

**One design note on presentation.** If a quality rank is ever rendered, small deltas need bands or tiers, not positions. A secondary source relaying Zhao et al. reports that [10% of low-effort or bad-faith voters could shift LMArena ranks by five places](https://t-redactyl.io/posts/2026-02-09-why-the-lm-arena-is-vibes-based/); the skeptic marked that PLAUSIBLE and unverified at source, so treat it as a caution rather than a specification.

## 7. Open questions

**Does anyone want a catalog narrowing tool at all?** This is the most uncomfortable gap. The prior art in pickai's exact niche has almost no adoption: [modelpedia gets 17 weekly npm downloads](https://github.com/assistant-ui/modelpedia/blob/main/packages/npm/README.md), [whichmodel-mcp has 0 stars](https://github.com/Which-Model/whichmodel-mcp), [tkellogg/model-selection has 8](https://github.com/tkellogg/model-selection), and [llm-info's ~8,251 weekly downloads come from being a dependency of the author's own products](https://github.com/paradite/llm-info), not independent adoption. The two Ask HN threads quoted most often in this research have 2 points and near-zero comments. The demand for narrowing is inferred from behavior (regulated buyers, aicost's positioning), not measured. *Settled by:* shipping the web app and watching whether anyone completes the flow, and by instrumenting whether users export code or just read the list.

**Is the entry point a fresh choice or a forced migration?** The ellamind migration and the OpenAI deprecation thread suggest forced replacement is common, which would make a "diff against my current model" view more valuable than a ranked list. We have two strong anecdotes, not a distribution. *Settled by:* an A/B of the primary input, "describe your task" versus "name the model you are replacing."

**Would anyone actually configure a quality adapter?** The whole v3 quality argument rests on users wiring in AA or OpenRouter data, or their own eval scores. Nobody in the evidence is doing that today with any library. *Settled by:* ship the adapter with a working AA example and measure whether it is used, or whether users only ever run the default profiles.

**Does quantization affect quality?** Genuinely contested. A user [filed a feature request by name](https://github.com/RooCodeInc/Roo-Code/issues/11325) because FP4/Int4 routing was corrupting Korean output, and the feature shipped. But OpenRouter, with the best instrumentation in the field, says directly that it has not seen a measurable impact from quantization alone on tool-call quality, and blames tool-call parsers. Treat quantization as a knob users ask for, not as an established quality predictor. *Settled by:* a controlled per-endpoint eval, which is out of pickai's scope.

**Does usage data beat metadata everywhere, or only at the high end?** OpenRouter's market-spend router [swept all 5 domains at `cost_tier=max`](https://openrouter.ai/blog/announcements/introducing-the-new-auto-router/) but was worse on two benchmarks and tied on one at the default tier, and one domain got nearly twice as expensive. The honest reading is "usage signal wins where quality matters most," not "usage signal wins." *Settled by:* nothing we can run. Take the narrow reading.

**Thin spots to name rather than write around.** Reddit was never fetched, so the local-model and quantization angle rests on single comments. The 289-entry attachment audit is a same-day community filing with no maintainer ruling and an unreplicated count; running the same contradiction scan against the `api.json` pickai already parses is cheap and would settle it locally. Rate limits have exactly one source. And latency, despite being the most widely implemented non-catalog axis across routers, appears in these corpora almost entirely as vendor documentation rather than as anyone asking for it, which is weak grounds for adding it to a library.

---

# Appendix: completeness critique

A final agent attacked the document above. Its findings are unedited.

## 0. Verified against the code first

Three things I checked in the repo that sharpen or contradict the document:

- **The document's own API-change list silently deletes `Purpose`.** Drop `contextCapacity`, `outputCapacity`, `recency` and keep `knowledgeFreshness` as a low-weight tiebreaker, and `/home/mlo/dev/niftymonkey/pickai/src/purpose.ts` collapses: Quality becomes `knowledgeFreshness(3) + costEfficiency(1)`, Reasoning becomes the identical weights plus `{reasoning: true}`, Coding the identical weights plus `{toolCall: true}`, Creative `knowledgeFreshness(2) + costEfficiency(1)`, Cheap `costEfficiency(7)`, Balanced `1+1`. Four of six profiles become the same two criteria, differing only by a filter. Purpose is a headline export and the document never says whether it survives. It should say so out loud, because the answer looks like "no."
- **`criterionCoverage` cannot be made load-bearing as written.** `contextCapacity` and `outputCapacity` in `src/score.ts` never return `undefined`; they call `minMax` over `m.limit.context` unconditionally. A model with a missing or zero limit scores as worst-in-set and is reported as *covered*. The other three criteria return `undefined` for missing data. Coverage currently lies for two of five criteria, which is a prerequisite bug the document's "make coverage load-bearing" recommendation steps over.
- The cache claim is right: `cache_read`/`cache_write` are parsed in `src/source.ts:75` into `ModelCost.cacheRead/cacheWrite` and read nowhere else. `costEfficiency` reads only `model.cost.input`.

Section 4's filter half and Section 5's "no pickai-computed quality number" are genuinely well-evidenced. I have nothing to add there.

## 1. Angles missed entirely

**The caller may not be a human.** Every design conclusion assumes a developer at a web app describing a workload. The fastest-growing "which model" consumer is a coding harness or agent picking a subagent model, or an MCP tool answering mid-task under a token budget. `whichmodel-mcp` appears only as an API-shape analogue, never as evidence about the delivery surface. An agent caller wants one resolvable answer plus machine-readable rationale plus "that one failed, what next", not three screens of elimination. This changes what v3's primary interface is.

**Who chooses and who approves are different people.** Tier 4 treats residency and license as filter fields on an individual's query. Nothing was searched on approved-model lists, AI governance, gateway allowlists, or FinOps. The "we used Copilot because we have the license" quote is the tip of a different product: pickai as the *format* for an org's approved list, enforced in CI. That is a policy-as-code library, not a chooser, and it is the only reading where "narrowing" has a buyer with budget.

**Decision persistence.** The document assembles every ingredient for a checked-in, dated model decision that gets re-evaluated (30 shutdowns on 3 to 6 months' notice, alias regressions, forced migrations) and then never proposes recording one. "Re-run last quarter's decision against today's catalog and show me what moved" is the strongest answer to the forced-migration entry point and it needs no new data class.

**Non-chat model classes.** Embeddings, rerankers, transcription, TTS, image generation. Entirely absent. The document treats `cost: {}` on per-image and per-second models as a bug rather than as the signal that a whole selection problem is unserved. Whether v3 is text-LLM-only is an unmade scoping decision.

**The open-weights buyer's actual question.** `openWeights` is a first-class filter and nobody asked what that audience asks. "Will it fit in my VRAM at Q4" is answerable from static metadata (params, quantization, context), which would land in Bucket A, the bucket the document declares nearly empty. The Reddit gap is named as a thin spot; the real miss is that the local branch has different axes of a different *kind*.

## 2. Thinnest evidence with the largest blast radius

**The workload-shape input contradicts its own source.** Cost-per-task is the centerpiece of both the API rework and Screen One, and it requires tokens per task. The document's own Tier 3 quote says users cannot supply that: "I can't predict what a feature will cost until I've already built it... a single user action might be 3 API calls or 40." The primary input asks for the exact number the evidence says people do not have. If that holds, the workload-shape API and the projected-bill screen both fail on first contact.

**Correlated evidence presented as three independent findings.** HN item 48096861 supplies the lead quotes for Tier 1, the bulk of Tier 2, and the "no respondent enumerated or filtered a catalog" claim that carries the anti-ranking conclusion. Section 7 admits that thread has 2 points and near-zero comments. One unrepresentative thread moves three separate conclusions at once.

**Every Tier 4 quote is one arXiv interview paper.** Residency, retention, and license eligibility gates, plus Screen One's whole framing, rest on `2607.16660`. Worse, residency is a property of a deployment region (Bedrock, Vertex, Azure), not of a model. The document elsewhere commits to staying model-level and refusing endpoint concerns. You cannot ship a residency gate and stay model-level. That is an internal contradiction, not just thin evidence.

**"Nothing in any sweep supports ranking by release date."** Absence of forum chatter about a default is weak grounds for deleting `recency`, which is plausibly the best quality proxy available from static metadata (within a lab, newer dominates older on nearly every published benchmark). The document never tests the proxy, and dropping it is a breaking change that guts four profiles.

**The 289-entry attachment contradiction** is same-day, unreplicated, and the document says the local check is cheap. It is the justification for an API break. Run the scan before writing the ADR.

**AA and OpenRouter licensing** for the quality adapter is asserted from methodology pages. Terms of use, caching rights, and redistribution were not checked. A first-class adapter over a source that forbids caching is a different design.

## 3. Where it hedges instead of concluding

- "Both need honest labels." `minOutput`/`minContext` are called a correctness bug on open-weight models and then prescribed a documentation fix. Either scope them to first-party endpoints, remove them, or ingest endpoint data.
- "Weight the argument, not the paper." This hands the reader the adjudication the document exists to do. Say whether the 22% inversion result is relied on.
- "treat it as a caution rather than a specification" (LMArena, five places). Bands versus positions is right or wrong independently of that source. Commit.
- "though its 17 weekly npm downloads mean nobody else is using it for this." That is a parenthetical about taking a single-maintainer dependency into a zero-dependency library. It is a decision, not an aside.
- "Keep BYOD as the *primary* path, not the escape hatch. It is currently... the least supported path in the API." Then the Concrete API changes list contains zero BYOD changes. Every item is a metadata field.
- Section 7 opens with "Does anyone want a catalog narrowing tool at all?", calls it the most uncomfortable gap, and settles it by "shipping the web app and watching". The most existential question is placed last and resolved by building the thing.

## 4. A different reading that the evidence supports at least as well

**Delete scoring rather than redesign it, and v3 gets smaller than v2.**

Take Section 3 at face value: Bucket C is biggest by question count and unreachable, Bucket B is data pickai should not own, Bucket A is small and partly wrong. The document's conclusion is "replace the axes with three tiers." But tier 3, "a small number of interpretable derived numbers for the final ordering," quietly reintroduces the composite ranking it just spent a page discrediting, in nicer units. Once eligibility has cut 1,847 to 40, cost per task is one arithmetic expression over two columns. An expression does not need a criteria framework, weights, profiles, or `scoreModels`. Under this reading v3 is: a correct eligibility engine, an explanation of every gate that fired, a BYOD scoring hook for the user's own numbers, and nothing else shipped as a default ranking. `Purpose`, `scoreModels`, and all five built-in criteria go. That is a coherent product with a defensible boundary, and the code check above shows the document's own change list already lands within one step of it.

**The independent-proposal finding is misread.** A stranger arriving at the same five axes inside models.dev is presented as proof of inheritance: "that is what inheritance looks like." It is equally proof of *convergence*, that those five are the complete set of ranking-relevant static facts, and anyone reasoning from any static catalog will find them. That reframing is stronger and more damning: the problem is not that the axes came from models.dev, it is that static catalogs cannot rank at all. Which again argues for deletion rather than substitution.

**Lifecycle is the product, and the chooser is the demo.** Section 7 uses engagement asymmetry to discount the Tier 1 and 2 threads (2 points, near-zero comments) but never applies the same lens upward. The loudest, highest-engagement sources in the entire corpus are all lifecycle: the 30-model shutdown thread, "Please Don't Deprecate GPT-Realtime", the alias regression. People argue about deprecation and shrug about selection. pickai's genuinely unique asset is a complete dated catalog, which is exactly what a "watch my model list and tell me what changed" product needs, and that product has a recurring reason to exist where a one-shot chooser does not. The document files this as an A/B on the input field. It deserves to be the alternative thesis.

## 5. The single highest-value follow-up

**When someone last changed a model identifier in production, what triggered it and what artifact did the change produce?**

It settles, in one study, the three things carrying the most weight on the thinnest support: the entry point (fresh choice versus forced migration), the deliverable (rank-1 versus shortlist versus ordered fallback chain versus pinned config), and whether catalog narrowing has any observed demand at all.

And it is measurable rather than inferable. Every sweep so far read what people *said* in forums. Nobody read what they *did* in code. Model identifiers are string literals in public repositories: mine GitHub for commits whose diffs change a known model ID, classify the commit message by trigger (deprecation notice, cost, quality complaint, new release, incident, experiment), and record the diff shape (single literal, ordered array, config table, env var, per-task map). A few thousand commits gives a distribution where the document currently has two anecdotes, and the diff shape directly answers whether the output should be a code snippet, a config file, or a fallback chain.
