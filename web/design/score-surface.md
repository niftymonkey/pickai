# The score surface

The decided behavior of scoring in the v3 web app: where a score comes from, how the blend is
built, and what the app says when a source is in trouble. Written after the fact, from what
shipped in `3e3c4bd36d` (above-table rework), `ce55a92e98` (last-good fallback), and
`35dcf67793` (source face rebuild). Decision 9.34 and findings in `design/v3-api-findings.md`
sit behind it; the library adapters live in `src/benchmark/`.

Everything here describes shipped behavior. The decision-line prototype's decisions
(2026-09-02) landed in `web/` on 2026-09-03.

## One source at a time

- The board is fed by exactly one benchmark source. There is no cross-source blend, ever.
  LMArena publishes Elo ratings around 1400 and Artificial Analysis publishes 0-100 indices;
  a weighted average across the two is arithmetic that means nothing.
- The switch is a two-way segmented toggle, not a dropdown. A third "Custom" segment arrives
  with BYOD upload and not before.
- LMArena is the default and loads on the server. Artificial Analysis loads in the visitor's
  own browser, through `fromOpenRouter`, so its numbers never touch this app's server.
- There is no consent gate. The browser-only fetch is the substance; a click that says "I
  agree" launders nothing. The terms sentence lives in the source's info hover, where someone
  choosing the source will read it.

## The switch machine

`web/core/source-switch.ts` is a pure machine; `web/components/decision-surface.tsx` runs its
effects. Every flip goes through it.

- State is the active `source` plus the browser fetch's phase (`idle`, `loading`, `ok`,
  `failed`).
- **The board never goes dark mid-switch.** Picking Artificial Analysis while its data is
  absent starts the fetch and leaves LMArena scoring the board. The active source changes only
  when a set is in hand (`fetchLanded`).
- The toggle shows the picked source while a fetch is in flight, so the click has an effect
  even though the board has not moved yet.
- A failed fetch keeps the current source and surfaces a Retry button. Retry re-enters
  `loading` from `failed` and nothing else.
- Picking a source that is already active is a no-op step, not a re-fetch.

## Weights and the blend

- Weights run 0 to 5 per metric. The default is the first metric at 1 and everything else at 0.
- **The blend never reaches all zeros.** The last positive weight cannot be dropped below 1, so
  the board always has a score to sort by.
- Weights are held per source. Flipping to Artificial Analysis and back restores the LMArena
  mix, because the two vocabularies are different sets of names.
- The mix is always spoken, in words. Where it is spoken, and in what words, is
  "What the blend sentence says" below.
- A model rated on only some weighted metrics still scores, and its cell says so
  ("2/3 weighted metrics"). Rated on none, it is unrated, which is a state and not a zero.

## What the blend sentence says

Settled 2026-09-02, built 2026-09-03. Percentages were replaced because they
describe the arithmetic and not the intent: "67% Coding, 33% Intelligence" never says that
coding matters most and intelligence still counts.

- The sentence is a **ladder read against the biggest weight, not against 100**.
- One weighted category is named, not measured: "Ordered by Overall rating."
- All weights equal: **"X and Y equally"**.
- The leader holding half the total weight or more is **"X above all"**, and then every other
  category is seasoning, however close the runner-up sits. A leader under half is **"X first"**,
  and the categories holding at least half of what it holds each take a **"then Y"** rung.
- Everything below that rung is gathered at the end as **"with some Z"**, joined with "and".
- **A chip label is not always a sentence word.** LMArena's "Overall" is a fine chip and a bad
  noun, so a category may carry a prose form used only inside the sentence: the chip says
  Overall, the sentence says "overall rating".

Worked examples, which are the acceptance cases:

| Weights | The sentence |
| --- | --- |
| Overall 1 | Ordered by Overall rating. |
| Coding 2, Intelligence 1 | Ordered by Coding above all, with some Intelligence. |
| Coding 5, Intelligence 1 | Ordered by Coding above all, with some Intelligence. |
| Coding 3, Math 3 | Ordered by Coding and Math equally. |
| Coding 4, Following 3, Terminal 2, Intelligence 1 | Ordered by Coding first, then Instruction following, then Terminal tasks, with some Intelligence. |
| Coding 5, Math 1, Creative 1 | Ordered by Coding above all, with some Math and Creative writing. |

The known weakness, accepted by Mark: 2-to-1 and 5-to-1 read identically, because both are
"above all with some". A third leader word for the extreme was offered and left out.

## The decision line, the receipt, and the two headings

Settled 2026-09-02, built 2026-09-03. This supersedes the doors design that both
design agents converged on, which Mark rejected in use.

- **The doors are dead.** "Narrow them" and "Change the order" were a pair of buttons in the
  decision line that opened a job's controls and then vanished for the session. They failed on
  three counts: the narrow door had to guess a rule to open, so the click taught nothing;
  "change the order" framed the act as fiddling rather than as stating what matters; and a
  control that lives in a sentence and then disappears has no stable home.
- **Discovery rests on both jobs being permanently visible and named.** The rail is headed
  **Model requirements** (it was "Narrow" until 2026-09-03). The bench is headed **Score**.
- **Score replaces Rank**, because the library already calls it scoring, the table column is
  already Score, and both children were already named for score.
- **Score never folds.** The collapsed one-line Rank block is gone.
- **The source control sits beside the Score heading**, not in a labelled row beneath it.
- **The blend carries no visible label.** With Score above it and the source beside that, the
  chips name themselves; "Blend" only parsed for people who already knew the design. The chip
  group keeps an accessible name.
- **The census is a receipt, not a sentence.** One dim monospace line directly above the
  table, right-aligned: listings, models, scored, unscored. It is a
  fact about the data, so it does not move as rules are applied. Its scored and unscored halves
  do follow the active source.
- **The page header carries no counts.** The catalog total appeared in the header and again in
  the decision line, which at first paint are the same number printed twice.
- **The decision line does not count the catalog at first paint.** With no rule active it is
  only the order sentence. A count enters it once a rule has cut something.
- **The table shows where the scores run out.** Settled by Mark 2026-09-02: the board holds
  every model that passes the rules, and a divider row after the last scored one names how many
  follow it with no score from the active source. Opening on the scored models only was the
  rejected alternative. The order never claims rows it cannot rank, and the receipt above the
  table already states the coverage, so the sentence never has to confess.

### What the decision line and the search row actually say

Written 2026-09-03 from the prototype's own source, because the section above summarised
these decisions without recording the words, and the words were then missed in the build.
The order above the table is: decision line, change note, rule, Score heading with the
source beside it, blend chips, search row, table.

**The decision line** is one sentence at 17px, directly under the wordmark.

- No rule active: `Ordered by {order clause}.`
- Any rule active: `{survivors} of {total} models pass your {n} rule|rules, ordered by
  {order clause}.`
- The order clause is the blend sentence with its own "Ordered by" and full stop removed,
  so the two never disagree. The blend row carries no sentence of its own.

**The change note** is the line under it, at 13px, its lead in accent ink and its second
half in quiet ink, with its slot reserved so an arriving line never pushes the page down.
It says what the last move did to the top ten, which the board alone cannot say.

| The move | The line |
| --- | --- |
| A rule applied, top ten unchanged | `{rule words}: same top 10.` + `Everything at the top already qualified.` |
| A rule applied, top ten moved | `{rule words} replaced {n} of the top 10.` + `Brought in {a}, {b}, {c} and {n} more.` |
| A rule removed | `{rule words} removed.` |
| A weight moved, top ten unchanged | `Weighting changed.` + `Same top 10.` |
| A weight moved, top ten moved | `{category} now carries the order.` + `It moved {n} of the top 10.` |
| The source flipped | `Now ordering by {source}.` + `{n} models carry a score there.` |

- Arrivals are named three at a time and the rest counted.
- A move that changes more than one row at once names no rule, because a note that names
  the wrong rule is worse than no note.

**The row above the table** holds the search box on the left and the census receipt on
the right, on one line. There is no "Results" label: the table is directly below it. The
search grows to a 26rem cap rather than to half the row, and it is the half that shrinks
as the window narrows, so the numbers keep their space to the last moment; below 640px the
row wraps and the receipt wraps with it. The receipt reads
`{listings} listings → {models} models · {scored} scored · {unscored} unscored`. It does
not name the source: the switch a few lines above already says who is scoring.
The search's cut-match hints open below that row, not beside the box.

**The Score heading sits level with the toggle.** The switch's trouble note is a sibling
below the head row, never a member of it: inside the row it changed the row's height and
dropped the heading ten pixels the moment a source went stale.

**An info hover is structured, not a paragraph.** A state line in monospace above a rule,
then one idea per paragraph, in a 320px box. A wall of sentences in a narrow box is
unreadable, which is what the first build shipped.

**The Score heading carries no "Score source" label.** The heading names it. The per-option
info hovers stay, because they carry the measured dates and the Artificial Analysis terms.

**The survivor count is not printed above the table.** The decision line holds it. What
stays above the table is the guidance for a board with nothing on it, which neither the
decision line nor the receipt can say.

## Which categories are offered

- The LMArena split publishes about 25 cuts, including language and industry slices and
  control cuts like "Exclude ties". Five rows of chips is not a decision surface.
- The app curates to six blendable categories through `keepMetrics` in `web/lib/benchmarks.ts`:
  overall, coding, math, hard prompts, creative writing, instruction following.
- **The library adapter still emits everything** (9.34). Curation is a choice this surface
  makes, not a capability the library lacks.
- Artificial Analysis offers three: intelligence, coding, agentic.

## The last-good set

`servingLastGood` in `web/core/benchmark-source.ts` wraps the live fetch. The memory is
module-level in `web/lib/benchmarks.ts`, because react's `cache` is per-request, and under that
memory sits a committed floor: `web/lib/arena-snapshot.json`, a dated curated set.

- Three states: `ok` (fresh), `stale` (the live fetch failed and an older set stood in),
  `unavailable` (it failed with nothing at all to stand in, which now means the floor was
  removed).
- **The floor exists because a build worker is cold by definition.** LMArena answers a build's
  fetch with 429 often enough that a deployment shipped with no score column, no band, no blend
  editor and no score floor rule, for its whole revalidate hour, on 2026-09-02. Refresh the
  snapshot when it feels old; the page says the date it is serving.
- **A stale set still scores.** Only `unavailable` empties the score column.
- **A covered failure logs `console.warn`; an uncovered one logs `console.error`.** A recovery
  is not a page error, and Next's dev overlay treats an error as one.
- The visible caption names which set is on screen. Provenance beats freshness: an old number
  labelled old is better than a blank column.

## What the surface says, and where

- **Dates live in the hovers.** Each source's info hover leads with when that source was
  measured, then how that source works and what its numbers cannot tell you.
- **A visible note is for trouble only**, and only about the source currently on the board: a
  browser fetch in flight, a failed fetch, a stale LMArena set, an unavailable one. A healthy
  source says nothing and the search box keeps its width.
- The note is a permanent `aria-live="polite"` region, so a change is announced whether or not
  it takes a line.
- One tooltip pattern everywhere (`web/components/info-hover.tsx`): hover, focus, and click all
  open it; Escape closes it; the gap between trigger and tip is padding, so the pointer can
  cross into the tip without dismissing it.
- The blend row carries its own hover explaining what a category score is for the active
  source.

## Deferred

- **Cost as a weight, not only as a fence.** Found by Mark 2026-09-02 and not yet designed.
  His words: "We are not including cost. We, in our library examples in version one and version
  two of this library, have had cost be part of what is used when you want to weight the scores
  against each other, because being able to do these things but also not have it cost way, way,
  way too much is important." He reached it by noticing the blend surface felt wrong and not
  being able to say why. v1
  and v2 carried `costEfficiency` as a weighted criterion, and every Purpose profile included
  it as a low-weight tiebreaker; v3 deleted the built-in criteria, so cost now survives only as
  the rail's hard price fence. A fence and a weight are different promises: "never above $1"
  against "cheaper is better, all else equal". The blend needs the second one back. Open with
  it: what the chip is called, how a price normalises against an Elo or an index, whether it is
  offered per source or once, and how it reads in the blend sentence.
- **Artificial Analysis in the prototype is placeholder data**: six invented metric names and
  an invented count of 341 scored models. Its real coverage against the folded catalog has
  never been measured. The shipped app offers three AA categories, not six.
- Per-axis sorting and the rank column: slice D, `prototypes/web/design/sorting-spec.md`.
- The browser-side last-good copy in `localStorage`: slice E. One key, no chunking (the
  curated set is 276 KB; the full set is 1.2 MB against a 5 MB budget). The order is live
  fetch, then the server's memory, then the browser copy, then the committed floor, and the
  caption must say which one is on screen.
- A scale legend for the Elo-to-index jump on a source flip: parked at the above-table
  critique.
- BYOD upload and its partial-match repair screen (9.13), which is what adds the third segment.
