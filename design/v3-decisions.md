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
> Start with the rules you did not choose. Customer data cannot leave the EU. Your company pays for
> Azure and will not add a vendor. Your contract forbids the provider from storing your prompts.
> Each rule cuts hundreds of models, and the app names the rule that cut them, so you watch the
> count drop and see why.
>
> Sort what is left by whatever matters this week. Cheapest, most capable, biggest context, newest.
> You pick, because we do not know which one binds your project. Every number says where it came
> from and when it was measured. Where nobody has measured it, the app says so instead of guessing.
>
> You end up with three to seven models to test, in order, with a fallback chain. Each one shows the
> per-token rate and what that rate costs at your actual volume.
>
> Then take the code. The answer expires: models ship every week and prices move. The code saves the
> decision you just made. Run it next quarter to find out whether it still holds, instead of coming
> back here and rebuilding your reasoning from memory.

**What each paragraph commits us to.**

1. Discovery is a stated goal. The app must surface models the user did not know about, not just
   rank the ones they named.
2. Eligibility gates are the opening move, and **every gate must name itself when it fires**. This
   requires the policy fields from 9.8 (residency, retention, license held) that models.dev does not
   carry.
3. **The user picks the sort. We do not pick for them.** This is the correction to v2's profile
   weights and it is deliberate: the research shows the binding constraint varies per project, so
   the app offers the axis rather than assuming it. Every number renders with source and date
   (9.4, 9.14), and absent data renders as absent rather than as zero (the coverage work).
4. The deliverable is an ordered set of 3-7 with a fallback chain, never a rank-1 answer. Cost shows
   **both** the per-token rate and the projected spend at the user's volume. Showing only the
   projection reads as hiding the rate.
5. **The code export exists for re-evaluation over time, not to avoid the UI.** Mark's framing: the
   web app exists precisely because people do not want to write code to make this choice. The code
   is what lets them re-run the same decision on their own schedule as the catalog moves. This is
   the answer to "why ship a UI for a library."

**Deliberately not in the pitch:** lifecycle/retirement data. It is recommended by the research and
grounded in real demand (Tier 5), but it is unbuilt, models.dev does not carry retirement dates or
successor pointers, and it needs a new data source. Scope undecided. See 9.16 when settled.

**Provenance note:** drafted here, revised against Mark's four corrections, then run through his
`unslop` pass in another tool. That pass is not available in this environment.

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
