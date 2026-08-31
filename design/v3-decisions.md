# pickai v3: decisions log

Settled decisions with their rationale. Numbering is preserved from the working session so existing
cross-references keep resolving; it is not a priority order.

Governed by `v3-north-star.md`. The proposal under grilling is `v3-api-surface.md`. Evidence is in
`design/research/`. The story of how these were reached is in `continue-v3-redesign.md` at the repo
root.

**Superseded by these decisions, in `design/research/north-star-research.md`:** its recommendation to
wire in Artificial Analysis (killed on licensing, 9.8); its recommendation to expand lifecycle data
(parked, 9.16); and its silence on the LMArena CC BY dataset, which was found afterward (9.10, 9.11).
That file is dated research evidence and is deliberately left unedited.

---

These came out of a working session with Mark reviewing the research. They are **settled**, not proposals.

### 9.1 Ranking stays. The assistant overstated the research.

The research says the *deliverable* should be an ordered explained shortlist rather than a rank-1
answer. The assistant compressed that into "stop ranking," which the evidence does not support.
Ordering is how you get from 1,847 candidates to a testable few. Mark pushed back and was correct.

Two claims the assistant made as disagreements, and how each resolved:

- **"The five criteria contain no capability axis, therefore pickai's thesis is metadata-only."**
  Withdrawn. `src/purpose.ts` predates the benchmarking mechanism and was never revisited.
  `examples/` contains four working benchmark examples (`aa-benchmarks.ts`,
  `lmarena-benchmarks.ts`, `multi-benchmark.ts`, `agent-workload.ts`), all using `minMaxCriterion`.
  The mechanism exists and is exercised. What survives is narrower and is not a disagreement: the
  built-in profiles are the front door, `Purpose.Quality` currently returns recency, and the
  defaults should be updated to match the mechanism already shipped.

- **"Min-max is a design disagreement."** Refiled. It is a bug list for 3.0, not an argument about
  what to build: `cost: {}` normalizes as best-in-class free, a promotional rate tops every Cheap
  result, and scores move when the candidate set moves.

**Consequence for scope: Mark's read was right.** This is a bounded revision of a shape Artificial
Analysis also ships commercially (an explicitly weighted, reweightable, versioned composite,
structurally identical to pickai's weighted-criteria model). `find`, `recommend`, `applyFilter`, the
constraint system, and the weighted-criteria engine all survive. Do not reopen this as a rewrite.

### 9.2 Cost ranks on absolute dollars, not a normalized score

**Revised by 9.22 (2026-08-30):** the "projected cost per task" half of this decision is dead.
What survives is the core: no normalized cost score, absolute published numbers only. See 9.22.

Cost should push a model up the order. In `Purpose.Quality` it currently carries weight 1 of 13
while recency carries 5. The fix is to rank on projected cost per task at the user's token shape,
an absolute reproducible number, rather than on a min-maxed `cost.input`. Per-token price does not
track per-task cost.

### 9.3 No LLM in the web app

Settled, both parties agreed independently. Every part of the pitch is deterministic: gates are
`find()`, cost is arithmetic, lifecycle is a lookup, quality is a third-party feed, and the
explanation prints numbers already computed. The only part wanting a model is turning free prose
into a workload shape, and presets with editable defaults cover that. Three reasons to hold the
line: it is free and instant, every answer is reproducible, and the exported pickai code must be
able to reproduce the result, which breaks if a model interpreted the input.

Revisit only if users demonstrably stall on the form.

### 9.4 A capability signal ships built in, and BYOD stays first-class beside it

Agreed in principle. The library needs an axis for "can it do the job," and models.dev cannot
supply one.

**Hard constraint from Mark: the built-in source must be free to the end user.** He will not require
anyone to pay a third party to get benchmarks through pickai. `examples/aa-benchmarks.ts:15` states
Artificial Analysis requires an API key and points at `lmarena-benchmarks.ts` as the free
alternative. Whether the AA key itself is behind a paywall was unresolved and is now in research.

Requirements for the built-in source: free to the end user, well respected, machine readable,
maintained, and joinable to models.dev IDs. Whatever is chosen must render its source name and date
next to every number it produces.

BYOD is a first-class path beside the built-in, not an escape hatch. The North Star flags it as
currently the most important input in the library and the least supported path in the API.

### 9.5 Research: COMPLETE

Four parallel agents, all landed 2026-08-29. Outputs in `design/research/`: `aa-access.md`,
`free-benchmark-sources.md`, `benchmark-adoption.md`, `benchmark-id-joining.md` (plus an addendum
that reversed its own verdict). Conclusions are recorded in 9.8, 9.10, 9.11, 9.12 and 9.14.

### 9.6 What remained open after this session

Closed since: the benchmark source (9.14), lifecycle scope (9.16), the design skill (9.17), the
pitch (9.15), and the repo structure (9.18).

Still open, and deliberately routed to the grilling session rather than decided here:
- **Does `Purpose` survive**, and which criteria survive with it. Three readings are laid out in
  `v3-api-surface.md`, including one where v3 is smaller than v2.
- **Is the unit of selection a model or a model-and-endpoint.**
- **Whether policy gates (residency, retention, license) can be sourced at all**, or get parked the
  way lifecycle did. If they get parked, the North Star's rule 3 has gates it cannot enforce.

**All three closed by the grilling session, 2026-08-30:** `Purpose` deleted (9.20), model level
(9.24), residency and retention parked with license reframed as user-declared (9.25).

### 9.7 The ID module is larger than the public surface, and that is the BYOD gap

`src/id.ts` is 219 lines with ten functions: `normalizeModelId`, `parseModelId`, `resolveProvider`,
`extractDirectModelId`, `toOpenRouterFormat`, `toDirectFormat`, `matchesModel`, `extractVersion`,
`deriveOpenRouterId`, and the internal `inferProvider`.

`normalizeModelId` strips the provider prefix, converts dots to hyphens, drops 8-digit date suffixes
and lowercases, so `anthropic/claude-3.5-haiku` already matches `claude-3-5-haiku-20241022`.
`inferProvider` does name-based provider inference from a prefix. `extractVersion` pulls a version
number while avoiding model sizes (`70b`, `8x22b`) and date codes (`2512`). `examples/lmarena-benchmarks.ts:49`
performs its whole join in one line: `matchesModel(b.modelId, m.id)`.

**But `src/index.ts:60` exports only `matchesModel`.** Nine of ten functions are internal.

A built-in adapter written inside the library gets the full module. A BYOD user gets one boolean:
no normalize, no parse, no provider inference. Section 9.4 makes BYOD a first-class path, and one
boolean is not a first-class toolkit for joining an outside dataset.

**Requirement for v3:** whatever matching surface ships must be good enough for a BYOD user to do
their own join, not just good enough for our built-in adapter. Decide deliberately which of the ten
become public rather than leaving the current split as an accident.

Two known gaps in `matchesModel` itself, from reading the code:
- Variants are not stripped. `parseModelId` can pull `:thinking` / `:free` off an ID, but
  `matchesModel` never calls it, so `claude-3.7-sonnet:thinking` will not match `claude-3-7-sonnet`.
- Spaces are never converted to hyphens, so it matches an ID against an ID. A leaderboard that
  publishes display names ("Claude Sonnet 4.5") falls through. Whether that matters is being
  measured by the `benchmark-id-joining.md` research.

### 9.8 Benchmark source decisions (settled 2026-08-29)

**Both existing benchmark integrations are dead ends. Finding a replacement is v3 work.**

- **Artificial Analysis: dropped.** Not for price. The free tier is genuinely free, no card. Their
  Data Platform Terms s2.5 forbid using the data for a product whose primary purpose is
  "model/provider selection guidance," which describes pickai in their words. s1.9 uses the same
  phrase to define a Competitive Product. s2.4(c)/(d) forbid embedding it in a customer-facing
  product and combining it with third-party data (the models.dev join). s4.2 applies the ban to
  paid tiers too, so buying up does not unlock it, and breaches are carved out of the liability cap
  with indemnification. Do not send a consent request: even a yes would put the library's core
  capability on one company's revocable permission, and they can withdraw it precisely when pickai
  starts to look like competition. Detail: `design/research/aa-access.md`.

- **LMArena free mirrors: dead as a data source.** Not a matching problem. The mirror used by
  `examples/lmarena-benchmarks.ts` last committed 2025-05-23. The live API returns 403. LMArena's
  own `lmarena/arena-catalog` (Dec 2025) is better at 40.8% join and 72% on the top 50, but on
  direct-provider non-deprecated text-to-text models coverage is **19/112 = 17.0%, and 0 of the 30
  most recently released**. Perfect matching cannot fix that. Detail:
  `design/research/benchmark-id-joining.md`.

**Matching is not the bottleneck; coverage and freshness are.** Evaluate every candidate source on
recency of the underlying data and coverage of newly released models first, and on ID joinability
second. A source that joins perfectly but lags releases by six months is useless for a chooser.

**No crosswalk exists to borrow.** modelpedia (active, 7,952 models) has `alias`/`snapshots`/
`bedrock_id`/`vertex_id` but no benchmark IDs. llm-info is 44 hand-written models. LLM Stats is
deprecated with `provider_model_id` null in all 244 rows. LMArena hand-maintains 141 name mappings
themselves. A hand map is unavoidable: roughly 250-350 lines plus a data file needing ongoing human
upkeep. That upkeep is a cost the library has never carried and must be accepted deliberately.

### 9.9 Bugs go in v3, not before

Mark's call: fix in the redesign rather than patching the current release.

- `examples/aa-benchmarks.ts` calls `/api/v2/data/llms/models`, which now returns
  `deprecation: 2026-08-04` and `sunset: Wed, 04 Nov 2026`. **After 2026-11-04 it returns 410 Gone.**
  Its comment about individual benchmark scores is true today and stops being true silently.
- `examples/lmarena-benchmarks.ts` produces wrong scores today. Five `chatgpt-4o-latest-*` rows
  spanning 92 Elo collapse to one catalog entry because `find` keeps the first match with no
  signal; 16 more catalog models hold 2+ competing ratings from reasoning-effort variants, spreads
  up to 25 Elo.
- `contextCapacity` / `outputCapacity` never return `undefined`, so a model with a missing limit
  scores worst-in-set and is reported as covered. Coverage lies for 2 of 5 criteria.
- `src/source.ts:75-76` parses `cache_read`/`cache_write` into `ModelCost` and nothing reads them.
- `cost: {}` normalizes as best-in-class free; a promotional rate tops every Cheap result.
- `matchesModel` does not strip `:thinking`/`:free` variants and does not convert spaces.

**Timing constraint this creates:** 2026-11-04 is now a real deadline. If v3 has not shipped by
then, the published package contains an example that hard-fails. Either v3 lands first or that one
example gets pulled forward as an exception.

### 9.10 The benchmark source answer: LMArena's official dataset (measurement resolved in 9.11)

**Two researchers who never spoke to each other independently landed on the same source.** That is
the strongest signal in this research.

`lmarena-ai/leaderboard-dataset` on Hugging Face. Released April 2026, and it is NOT any of the
mirrors previously tested. It clears every bar at once:

- No key, no account.
- Explicit **CC BY 4.0**, so it can be shipped and cached with attribution.
- Updated near-daily; latest publish date observed **2026-08-27** (two days before this was written).
- 395 models in the text `overall` category, open-weight models included.
- Readable as plain JSON via `datasets-server.huggingface.co/rows`, so **zero dependencies survive**.
- Per-category Bradley-Terry ratings with confidence intervals, plus a **style-controlled subset**
  that corrects the length-and-markdown bias the arena operators themselves documented.
- `webdev` and `agent` subsets give future axes with no new adapter.
- Join to models.dev measures ~49% with three normalization rules. Residual misses are arena
  codenames and preview snapshots with no models.dev counterpart at all.

**Still open, and it is the last gate:** coverage of recently released models. The earlier verdict of
"0 of the 30 newest" was measured against the dead mirrors, not this dataset. The joining agent is
re-measuring to produce a figure directly comparable to its previous 19/112. If this dataset also
fails on new releases, the whole built-in-source plan fails with it.

**Runners-up and why they lose.**

- **AA via OpenRouter's keyless `/api/v1/models`.** 165 of 396 models carry
  `benchmarks.artificial_analysis`; OpenRouter already did the identity join, which is the expensive
  part. pickai would not be an AA customer, so AA's s2.5 ban may not bind. Blocked on an unresolved
  question: do OpenRouter's terms permit re-serving it? Being measured alongside the above. Keep as
  the fallback if arena coverage fails.
- **MMLU-Pro `results.csv`** (TIGER-Lab). One 27KB CSV, one GET, apache-2.0 on the results data,
  262 models, current. Fatal flaw: **39 of the last 40 rows are `Self-Reported` vendor claims**
  carrying only an `Overall` number. The newest models, the ones users care about most, are the
  least rigorous rows in the file.
- **Epoch AI Capabilities Index.** Best metric (one composite per model, plus a `Model accessibility`
  open-weights flag pickai has no equivalent for), clearest license, rebuilt daily, and the only
  source that survived independent scrutiny intact: a statistician replicated it from published
  code, found a model-aggregation bug, and Epoch conceded. **Ships only as a ZIP, which a
  zero-dependency library cannot read.** Ruled out on that alone, not on quality.

**Ruled out.** LiveBench (active repo, dead reputation: "notoriously sloppy"). SWE-bench, Scale SEAL,
Terminal-Bench (they score *agent scaffolds*, not models, so no row maps to a models.dev model).
Vellum (Terms of Use). llm-stats (CC BY repo deprecated 2025-10-24; live API now requires per-user
signup). Artificial Analysis direct (s2.5, see 9.8).

**Trust caveat to carry into the UI.** Arena now sells evaluations to the same labs it ranks, at
~$100M ARR. Use the style-controlled subset, render confidence intervals rather than positions, and
print the source name and date next to every number.

**Incidental:** `lmarena.ai` now 301s to `arena.ai`. Both researchers independently confirmed
`examples/lmarena-benchmarks.ts` is serving 15-month-old rankings (source last committed
2025-05-23; newest date key inside the JSON is `20250522`).

### 9.11 Coverage measured. Freshness is no longer the blocker; licensing is.

The joining agent re-measured both routes and **reversed its own verdict**. Detail in the addendum
to `design/research/benchmark-id-joining.md`.

The earlier "arena data is dead / 0 of 30 newest" finding was measured against retired artifacts.
The 403 was a retired hostname: `lmarena.ai` is now `arena.ai`.

| | LMArena HF dataset | OpenRouter `/api/v1/models` |
| --- | --- | --- |
| License | **CC BY 4.0, explicit** | Ambiguous, see below |
| Key required | No | No |
| Freshness | Modified 2026-08-28; publish date 2026-08-27 | `z-ai/glm-5.3-flash` listed 3 days ago already scored |
| Size | 2,251,197 rows / 22 configs; 395 models, 11.5M votes | 396 models; 165 with AA indices, 152 with Design Arena |
| Coverage (direct, non-deprecated, text) | 35/112 as-is, **46/112 (41.1%) folded** | **38/112 (33.9%)** |
| 30 newest models | 8/30 as-is, **14/30 folded** | **18/30** |
| Collisions | 9 candidates hold multiple ratings, Elo spread to 19 | **Zero orphans, zero collisions** |

Liveness is proven, not inferred: `claude-opus-5-high` appears in 12 arena leaderboards between
2026-07-26 and 2026-08-27, one every two to four days. AA-via-OpenRouter holds ~60% coverage for
every month of 2026.

**Why OpenRouter's data is structurally cleaner:** both it and models.dev catalog *API endpoints*,
whereas the arena catalogs *rated configurations*. That is the whole reason arena needs
reasoning-effort folding and OpenRouter does not.

**The licensing position, which is now the deciding factor.**
- LMArena: CC BY 4.0. Unambiguous. Shippable and cacheable with attribution.
- OpenRouter ToS (July 29, 2026) s7 forbids using "software, devices, scripts, robots... to scrape
  or copy any information on the Site or the Services" and forbids "developing a competing service."
  "Artificial Analysis" and "attribution" appear **nowhere** in 52,037 characters. So: no stated
  permission and no stated requirement, plus a general anti-scrape clause and a competing-service
  clause that a model-selection library plausibly falls under. This is silence plus risk, not
  consent. Distinct from AA's s2.5, which is an explicit ban.

**Addendum (2026-08-31), from `design/research/openrouter-terms.md`:** the "silence plus risk" read understates OpenRouter's side. `/api/v1/models` is deliberately published for keyless programmatic use (docs with keyless curl examples, open CORS, public cache headers, an RSS feed of the endpoint) while the neighbouring `/api/v1/benchmarks` is auth-gated, LiteLLM ships weekly keyless fetches of the same URL without objection, and the competing-service clause's operative subject is reselling API access to Models, which pickai does not do. The residual risk is Artificial Analysis, whose numbers the `benchmarks.artificial_analysis` fields carry: AA's Data Platform Terms bind only AA's own Customers and carry no flow-down, so no contract binds pickai, but AA has publicly objected to model-selection uses and EU/UK database rights need no contract. Consequence for 9.14's opt-in note: the stated reason is not "we are unsure this is allowed" but "these numbers originate with Artificial Analysis, whose terms restrict model-selection uses by their own customers, and OpenRouter grants no explicit reuse right, so the choice is yours."

### 9.12 New bug found: `deriveOpenRouterId` is wrong for ~46 models

Not a benchmark issue. `openRouterId` is a **documented public field on every `Model`**, and it is
incorrect at scale:

- **0/34 Mistral and 0/12 xAI**, because OpenRouter uses `mistralai/` and `x-ai/` while
  `deriveOpenRouterId` emits `mistral/` and `xai/`.
- **Malformed output for 3/13 Anthropic entries**, e.g. `anthropic/claude-sonnet-4-5.20250929`,
  where the date-suffix path collides with the version-dot rewrite.

Measured consequence: `openRouterId` joins OpenRouter's real slugs at 48.2%, **worse than
`matchesModel`'s 58.0%**. So the field built for this purpose performs worse than the generic one.
Estimated fix ~30 lines, after which it becomes the cheapest correct join available.

Add to the 9.9 bug list. This one is user-visible today, independent of any v3 decision.

### 9.13 BYOD delivery: publish a schema plus an agent prompt (Mark's design, adopted)

The web app publishes (1) a JSON schema for what benchmark data should look like and (2) a
source-neutral prompt the user hands to **their own agent**, which has access to their benchmark
data, to emit it in that schema. The user then pastes or uploads the result.

**Why this is the right shape.**

- **Licensing: clean.** pickai ships a format and a prompt, never data and never a key. It agrees to
  no terms. Whatever the user's agent fetches happens under the user's own agreements, on the user's
  side. This is the safe case identified in 9.4/9.8 and it sidesteps the AA problem entirely.
- **It preserves the no-LLM decision in 9.3.** The model runs in the *user's* agent, before the data
  arrives. The app itself stays fully deterministic: it receives JSON and validates it.
- **It removes the actual reason BYOD goes unused.** The blocker was never willingness, it was that
  every benchmark source has a different shape and hand-writing a converter is tedious. A prompt the
  user's agent runs removes that work.

**Guardrail on the prompt: keep it source-neutral.** "Point your agent at whatever benchmark data you
have access to" is fine. Naming a source whose terms forbid this use edges toward inducing a breach.

**Two failure modes to design against.**

1. **Agents hallucinate scores.** An agent asked for benchmark numbers it does not actually have will
   produce plausible ones rather than refuse. Mitigation, already required by 9.4: every entry must
   carry a source name and a date, and the UI must render them beside every number. A fabricated row
   either has no source or has one that can be checked.
2. **The join is the hard half, not the shape.** Supplied scores still have to match models.dev IDs,
   and the best measured rate is 41%. The upload screen must show what matched, what did not, and
   allow manual correction. Silent partial joins are exactly the bug already found in
   `examples/lmarena-benchmarks.ts` (9.9).

**One internal shape.** A paste, a file upload, and the built-in adapter must all normalize to the
same structure so nothing downstream cares where scores came from.

### 9.14 Benchmark source: DECIDED

**LMArena `lmarena-ai/leaderboard-dataset` ships as the default built-in. An OpenRouter adapter
ships as opt-in, off by default.** (Mark's call, 2026-08-29.)

Rationale: the default carries no licensing ambiguity (CC BY 4.0, attribution only), so the shipped
path is safe for every user without anyone reading terms. The opt-in gets better coverage on newly
released models (18/30 vs 14/30) and zero rating collisions, and moves the OpenRouter terms question
onto the individual user's own account rather than onto pickai.

Requirements that follow:
- Use the **style-controlled** arena subset, not the raw one.
- Render confidence intervals as bands or tiers, never as positions.
- Print source name and measurement date beside every number, both adapters.
- Fold reasoning-effort suffixes for the arena join, and handle the 9 models that then hold rival
  ratings (Elo spreads up to 19). Do not let `find` silently keep the first match, which is the
  existing bug in 9.9.
- The OpenRouter adapter must be visibly opt-in and must state why, so the user makes the terms
  decision knowingly.
- Fix `deriveOpenRouterId` (9.12) first; the OpenRouter adapter depends on a correct join.

### 9.15 The pitch (canonical, 2026-08-29)

This supersedes the product summary in section 1. Do not silently reword it.

> You probably have two or three models in mind already. The catalog has 3,558. One you have never
> heard of might be the right one.
>
> Start with your project's hard rules. Maybe you are locked into one vendor. Maybe the job needs a
> capability most models lack. Whatever your rules are, each one cuts a swath of the catalog, and
> the app names the rule that cut them, so you watch the count drop and see why.
>
> Sort what is left by whatever matters this week. Cheapest, most capable, biggest context, newest.
> You pick, because we do not know which one binds your project. Every number says where it came
> from and when it was measured. Where nobody has measured it, the app says so instead of guessing.
>
> You end up with a short, reasonable set of models to test, in order, with a fallback chain. Each
> one shows its published rates, side by side, and how they compare to the cheapest on your list.
>
> Then take the code. The answer expires: models ship every week and prices move. The code saves the
> decision you just made. Run it next quarter to find out whether it still holds, instead of coming
> back here and rebuilding your reasoning from memory.

**What each paragraph commits us to.**

1. Discovery is a stated goal. The app must surface models the user did not know about, not just
   rank the ones they named.
2. Eligibility gates are the opening move, and **every gate must name itself when it fires**
   (9.31). The gates are the ones real today: provider allow/exclude, modality, context, output,
   and the cost fence (9.23). Residency and retention are parked (9.25); the pitch deliberately
   names no specific rule so it does not promise them.
3. **The user picks the sort. We do not pick for them.** This is the correction to v2's profile
   weights and it is deliberate: the research shows the binding constraint varies per project, so
   the app offers the axis rather than assuming it. Every number renders with source and date
   (9.4, 9.14), and absent data renders as absent rather than as zero (the coverage work).
4. The deliverable is an ordered short set with a fallback chain, never a rank-1 answer (3-7 stays
   the internal build target per 9.32; the number stays out of the pitch by Mark's call). Cost
   shows the published rates side by side plus the comparison to the cheapest on the list (9.22).
   No volume projection, anywhere.
5. **The code export exists for re-evaluation over time, not to avoid the UI.** Mark's framing: the
   web app exists precisely because people do not want to write code to make this choice. The code
   is what lets them re-run the same decision on their own schedule as the catalog moves. This is
   the answer to "why ship a UI for a library."

**Deliberately not in the pitch:** lifecycle/retirement data. It is recommended by the research and
grounded in real demand (Tier 5), but it is unbuilt, models.dev does not carry retirement dates or
successor pointers, and it needs a new data source. Scope undecided. See 9.16 when settled.

**Provenance note:** drafted here, revised against Mark's four corrections, then run through his
`unslop` pass in another tool. That pass is not available in this environment.

**Revised 2026-08-30, wording approved by Mark.** Paragraph 2 was rewritten because its residency
and retention examples became parked gates (9.25), and because specific examples make readers
without those exact concerns self-eject; it now uses soft "maybe" examples. Paragraph 4 was
rewritten because the volume projection died (9.22) and Mark keeps numbers out of the pitch. Three
drafts were iterated; the text above is the approved middle ground.

### 9.16 Lifecycle data: PARKED for v3 (Mark's call, 2026-08-29)

Retirement dates, deprecation states, and successor pointers are **out of scope for v3**. Not
rejected: parked. The demand evidence is real (Tier 5; OpenAI shut ~30 models in one notice; the
ellamind forced migration), but models.dev carries none of it and sourcing it means taking on a new
feed plus its upkeep. Revisit after v3 ships.

Trigger to reopen: if usage shows people arriving to replace a named model rather than to choose a
new one, lifecycle becomes the primary axis rather than a nice-to-have. That is the "forced
migration" open question in `v3-north-star.md` section 7.

### 9.17 Design skill: install nothing. Use `impeccable`, already installed.

**Section 6's evaluation was flawed and is superseded.** It weighed three uninstalled options and
never accounted for `impeccable`, which is already in `~/.claude/skills/`. Verified against the
installed files, not from memory.

**What it already covers.** Its description names the exact surface we are building: "dashboards,
product UI, forms, settings, onboarding, and empty states... UX review, visual hierarchy,
information architecture, cognitive load, accessibility... error states, edge cases." 35 reference
files loaded on demand, so it costs nothing until used. It carries **both** axes section 6 split the
world into:

- *Does it look designed*: `product.md` (a product register with a "product slop test"), `typography.md`,
  `color-and-contrast.md`, `layout.md`, `motion-design.md`, `polish.md`.
- *Does it behave as expected*: `interaction-design.md` (eight interactive states, focus rings,
  keyboard/roving tabindex, overlay positioning, undo over confirm), `cognitive-load.md`
  (working-memory rule, load violations), `harden.md`, `responsive-design.md`, `ux-writing.md`.

It also states it is "Based on Anthropic's frontend-design skill," so the first-party skill section 6
suggested pairing is already inside it.

**Why not the section 6 options.** (c) was already dead by taste-skill's own scope line, which
excludes multi-step product UI with data tables. (a) and (b) overlap heavily with what is installed,
and stacking design skills forces precedence rules between them, which section 6 already identified
as (a)'s cost. Adding a second opinion on the same questions buys conflict, not coverage.

**The real gap, which no off-the-shelf skill fills.** Grepped the full reference set: uncertainty and
provenance appear only incidentally (`live.md`, `polish.md`), and tables appear as typography and
responsive concerns rather than as comparison-view design. Four problems this app has and no skill
answers:

1. **Rendering uncertainty.** Confidence bands and tiers instead of positions (9.14).
2. **Absent data as its own state**, distinct from both empty and zero. Central to the whole product
   thesis and it appears on every screen.
3. **Explaining a computed ranking with provenance**, source name and date beside every number.
4. **The partial-match repair screen** for BYOD uploads, where ~59% of supplied rows may not join
   (9.13).

These are domain problems, not craft problems. They belong in the repo, and `impeccable` wants them
there anyway: its preflight gates refuse to edit files until a non-placeholder `PRODUCT.md` exists.

**Next action when UI work starts:** run `impeccable teach` to build `PRODUCT.md`, seeded from the
canonical pitch in 9.15 and the four gaps above. Then `impeccable shape` for a confirmed brief. Do
not skip to `craft`; the skill's own gates block it and the output degrades to generic.

### 9.18 Repo structure: add `web` to the existing workspace (settled 2026-08-29)

**pickai is already a pnpm monorepo.** `pnpm-workspace.yaml` lists two packages, `.` (the library)
and `docs` (`pickai-docs`), and the root `package.json` already drives docs through
`pnpm --filter`.

Decision: add `web` to `pnpm-workspace.yaml` and create `web/package.json` depending on
`"pickai": "workspace:*"`. Roughly ten minutes of work. pnpm symlinks the real library, so library
edits are visible to the web app immediately with no publish or link step. The npm package is
unaffected: `files` is `["dist", "README.md"]`, so `web/` never ships.

Rejected: a full restructure into `packages/pickai` / `packages/docs` / `packages/web`. Several
hours, touches tsup, vitest, tsconfig, the docs `@examples` alias, the publish flow and every README
path, and buys only tidiness. Revisit later or never.

Rejected: separate repos under a shared parent folder. It looks cheap and is not. The web app would
need `npm link` or a published version, forcing a rebuild-and-relink on every library change, and
**a breaking API change and its consumer fix could not land in one commit.** That matters more than
usual here: the web app is the pressure test on the redesign. If a screen is awkward to build, the
API is wrong, and that signal should arrive in the same commit rather than next week.

### 9.19 Document structure (settled 2026-08-29)

The single 765-line working document was a chronological log that had begun contradicting itself
(section 1's product summary vs 9.15's pitch; section 6's open skill choice vs 9.17's decision;
"two bugs confirmed" above a list of six). Split into one file per job:

| File | Job | Committed |
| --- | --- | --- |
| `design/v3-north-star.md` | Why this exists and what to weigh on a hard call | yes |
| `design/v3-decisions.md` | This file. What was settled and why | yes |
| `design/v3-api-surface.md` | The proposal to be grilled | yes |
| `design/research/*.md` | Dated evidence, left unedited | yes |
| `continue-v3-redesign.md` (repo root) | The arc, session state, next steps | **no, git-ignored** |

The North Star was rewritten. Its previous contents were research findings, not a north star, and
now live at `design/research/north-star-research.md`.

The continue document belongs at the repo root and git-ignored, per the `continue` skill's
convention: a handoff is personal session state. Decisions were pulled out of it into this file
precisely so that nothing load-bearing lives in an ignored file.

---

These came out of the grilling session on `v3-api-surface.md`, 2026-08-30. Mark decided each one
individually. The settled surface itself lives in `v3-api-surface.md`; these entries carry the why.

### 9.20 `Purpose` is deleted. Profiles, if ever, are UI presets.

No built-in profiles ship in v3. A named blend of weights is the library picking the user's axis
and hiding the pick behind a virtue word, which North Star rule 4 forbids and which made
`Purpose.Quality` a lie in v2 (recency wearing the word Quality). The paved road for beginners is
`recommend` with a named axis, which is already a one-liner.

The future home for "click here for a common setup" is the web app: situation-named presets (the
six North Star situations are the natural list) that fill in visible, editable values. The pick
stays on screen and the exported code carries the final values, never the preset name. That is the
same pattern 9.3 already endorses for the workload form. **Reopen trigger:** if the shipped app
shows users stalling at "pick your sort," presets become UI work, not library work.

### 9.21 All five built-in criteria are deleted. Catalog facts are never scores.

`costEfficiency`, `contextCapacity`, `outputCapacity`, `recency`, and `knowledgeFreshness` all go.
One rule replaces per-criterion argument: **catalog facts are filters and sort axes, never
scores; scores come only from measured, attributed data.** Every 0-1 criterion over catalog
metadata needs either min-max (unstable, and banned as default behavior by rule 1) or an invented
fixed scale (an assumption wearing a number). Nothing is lost: every deleted criterion's fact
stays filterable, sortable, and visible, and `sortByKnowledgeCutoff` is added so knowledge cutoff
remains a pickable axis.

This goes one further than the draft, which kept `knowledgeFreshness` as a low-weight tiebreaker.
Mark cut it with the rest.

The weighted engine (`scoreModels`, `criterionCoverage`, coverage) survives per 9.1, fueled by
benchmark metrics and BYOD data, where the source defines the scale. `minMaxCriterion` stays
exported, opt-in only.

Results render as a table of facts, sortable by any column, with benchmark score as the default
sort. Mark's framing: people will absolutely want to re-sort the same list by input rate, output
rate, and the rest of the metadata they find useful.

### 9.22 Workload-based cost projection is dead. Cost renders as rates plus multiples.

Revises 9.2 and pitch paragraph 4. `projectCost` and `Workload` never ship.

Mark killed the projection in two steps. First: a projection assumes both models spend the same
tokens, and reasoning models do not (thinking tokens), so the number reads truer than it is.
Second, and decisive: he does not expect users to identify their workload well, so the input to
the arithmetic is a guess, and a guess times a rate is a wrong number with our name on it. "This
whole project-based cost thing just is not it and it needs to stop being a thing."

What ships instead: show $/M input and $/M output as published, each with source and date, and
beside each a multiple, "input 2x, output 5x the cheapest on your list." Division on numbers
already on screen, checkable by eye. Unknown price renders as "price unknown" and joins no
comparison (rule 1). No 0-1 cost score exists anywhere, so the min-max cost bugs cannot return.
Input and output rates can disagree about which model is cheaper; both are shown, and the
disagreement goes in the rule 10 "not covered" list. Thinking-token spend goes there too.

### 9.23 `maxCostInput` / `maxCostOutput` stay, resemantized as an outlier fence

The draft proposed replacing them with a `Workload` budget (dead, 9.22) or dropping them. Mark
supplied the missing context: they exist because script runs occasionally surfaced models at $100+
per million tokens, and he wanted them gone. That is not budget reasoning, it is a fence against
the absurd, and a fence is a gate on an absolute fact.

Sharpened semantics, to be documented: the fence cuts only models whose **known** price is above
the ceiling. Unknown price is never cut by this rule; an unknown price is not proven absurd, and
cutting it would turn absence into a number (rule 1). The old "silent bypass" was a bug only under
the budget reading. When the fence fires, it names itself (9.31). Auto-detecting outliers was
rejected: an invented threshold deciding for the user.

### 9.24 The unit of selection is the model, said out loud

Not model-and-endpoint. Endpoint selection is routing and rule 9 says pickai is not a router.
The cost of this call: `minOutput`, `minContext`, and the provider filters describe model-level
numbers that endpoints may undercut (`gpt-oss-120b` ships 8,192 to 117,964 max output by
endpoint). The honest fix is a plain label in docs, UI, and output: these numbers are model-level,
your endpoint may differ. `minOutput` stays under that label rather than being dropped.

### 9.25 Policy gates: residency and retention parked; license is the user's own fact

`dataResidency` and `zeroRetention` are parked the way lifecycle was (9.16): models.dev does not
carry them, they are provider-level facts needing a new hand-maintained feed, and Mark chose not
to take on that upkeep for v3. Not rejected: parked. **Reopen trigger:** if usage shows the
eligibility step failing to cut meaningfully without them, or users asking where the EU rule went,
the provider-level hand-kept file (small, slow-moving, source-and-date per row) is the design on
the shelf.

`licenseHeld` needs no source at all and never did: "we pay for Azure, no new vendors" is the
user's own fact, declared through the existing `providers` / `excludeProviders` filters. It needs
a firing message, not a dataset.

Consequence accepted with the call: the pitch's opening paragraph loses its residency and
retention examples and gets rewritten around gates that are real today (vendor rule, modality,
context, the 9.23 fence). Pitch rewrite requires Mark's explicit approval per 9.15.

### 9.26 `fromArena` fetches live. No snapshot ships.

Freshness is the whole reason the arena dataset won (9.10, 9.11); a snapshot bakes staleness into
the package and rule 6 says the answer expires. The fetch is one GET to
`datasets-server.huggingface.co/rows`, plain JSON, no key, zero dependencies. Offline and
pinned-date runs are already covered by BYOD machinery: run `fromArena` once, save the JSON,
replay through `fromBenchmarkJSON`. Determinism concerns are answered by `measuredAt` riding on
every `BenchmarkSet`: two different answers on two days are both defensible.

### 9.27 Rival configuration ratings: expose all, average never

The arena rates configurations; models.dev catalogs models. After the effort-suffix folding that
9.14 requires, 9 models hold rival ratings up to 19 Elo apart. The joined model carries every
rating with its configuration name. The UI renders the spread as a band ("1350-1369 across 3
configs"), the same honesty 9.14 already mandates for confidence intervals. When a single sort key
is needed, use the best-rated configuration's real score, labeled with which configuration it was.
Averaging manufactures a number nobody measured (rule 5). Silent first-match (the 9.9 bug) dies by
construction because the join carries plurality instead of discarding it.

### 9.28 Benchmark scores are named metrics with structured values

`metrics: Record<string, { value: number; low?: number; high?: number }>`, one row per rated thing
as the source names it. Named metrics because sources publish several things at once and a single
`value` forces a parse-time choice that breaks on the next metric. Structured values because 9.14
requires rendering confidence intervals, so the shape must carry them first-class and validatably.
Suffix-key conventions (`"overall_low"`) were rejected: invisible to the schema validator, and
magic key names make BYOD the harder path (rule 8).

### 9.29 ID exports: `normalizeModelId`, `parseModelId`, `resolveProvider` go public

Satisfies 9.7's requirement that a BYOD user can build the same join the built-in adapter uses:
normalize both sides, compare, and when that fails, parse and inspect. The other six functions in
`src/id.ts` stay internal, deliberately, so internals can be reworked without breaking changes.
`matchesModel` gets its two fixes for everyone (variants, spaces; 9.9). Exporting all ten was
rejected as freezing plumbing into public API.

### 9.30 The `attachment` filter is dropped; the field stays on `Model`

`attachment` disagrees with `modalities.input` on 289 catalog entries, so two filters over the
same intent can return contradicting sets. One question, one filter: `modality` over
`modalities.input`. The raw boolean stays visible on `Model` because it is catalog data and rule 2
says show what the source said. Deriving one field from the other was rejected: we do not know
which field models.dev maintains better, and silently rewriting source data is its own lie.

### 9.31 Explanations are the library's job, both halves

Filtering can return, alongside survivors, the removed models tagged with the rule that cut them.
Scored results carry per-metric contributions and the labeled sort key from 9.27. The pitch makes
naming-the-rule core behavior, and the exported code must reproduce the app's answer (9.3),
explanation included; UI-side recompute would write the logic twice and give script users nothing.
Carrier shape (second return field vs options flag) is an implementation detail.

### 9.32 `recommend` becomes the orchestrator over explicit inputs

No `Purpose` argument. Inputs: models, a filter, an optional `BenchmarkSet`, an ordering (a
comparator or weights over named benchmark metrics), and constraints. It runs filter, join, order,
and returns the ordered 3-7 shortlist with explanations, coverage, and the unrated bucket.
Everything it does can be composed by hand from `find` + `joinBenchmarks` + a sort; `recommend` is
the paved road, and the code export reads as one call with named arguments, re-runnable next
quarter (rule 6). Deleting it was rejected: it reopens 9.1 and scatters the
constraint-dedup-shortlist plumbing into every consumer.

### 9.33 Results are a table of facts; benchmark score is the default sort

Mark's requirement, stated while deleting the criteria: people must be able to re-sort the same
list by the metadata they find useful (input rate, output rate, context, max output, release date,
knowledge cutoff, provider, open weights), not only by the score. Score is the default ordering;
every fact is a column; models without a score sit in an unrated bucket rather than at the bottom
of the ranking (rule 1).

### 9.34 Rules split into catalog rules and metric rules, and metric rules are name-blind

Raised by Mark on 2026-08-31 while reviewing the filter module: nothing benchmark-flavored may be encoded into the core rule types, and anything a benchmark set carries must be rule-able. The rule union is therefore two halves. `CatalogRule` holds the closed set of kinds that read models.dev facts (plus the inferred maker, which the join may later enrich from a source's organization field without the rule changing). `MetricRule` arrives with the benchmarks slice as one kind, typed over `string` metric names with min/max thresholds, never a union of names, so a rule on an LMArena category or on a BYOD field like `ifbench` flows through with zero code changes. This extends finding 13's name-blindness from ordering weights to rules. A model with no value for a rule's metric survives the rule and stays in the unrated bucket, consistent with the 9.23 fence and rule 1. `fromArena` emits every category the dataset publishes, not a curated subset, and boolean BYOD facts ride as 0/1 metrics.
