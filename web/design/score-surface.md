# The score surface

The decided behavior of scoring in the v3 web app: where a score comes from, how the blend is
built, and what the app says when a source is in trouble. Written after the fact, from what
shipped in `3e3c4bd36d` (above-table rework), `ce55a92e98` (last-good fallback), and
`35dcf67793` (source face rebuild). Decision 9.34 and findings in `design/v3-api-findings.md`
sit behind it; the library adapters live in `src/benchmark/`.

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
- **An active score floor is cleared on every source change.** The floor names a metric, and
  the metric names change with the source; carrying it over would silently filter on a metric
  that no longer exists.
- The mix is always spoken as percentages beside the chips ("= 60% Coding + 40% Math"), even
  when one category carries the whole score.
- A model rated on only some weighted metrics still scores, and its cell says so
  ("2/3 weighted metrics"). Rated on none, it is unrated, which is a state and not a zero.

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
module-level in `web/lib/benchmarks.ts`, because react's `cache` is per-request.

- Three states: `ok` (fresh), `stale` (the live fetch failed and the last good set stood in),
  `unavailable` (it failed with nothing to stand in, which is what a cold start plus a failed
  fetch looks like).
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

- Per-axis sorting and the rank column: slice D, `prototypes/web/design/sorting-spec.md`.
- The browser-side last-good copy in `localStorage`: slice E. One key, no chunking (the
  curated set is 276 KB; the full set is 1.2 MB against a 5 MB budget). The order is live
  fetch, then the server's memory, then the browser copy, and the caption must say which one is
  on screen.
- A scale legend for the Elo-to-index jump on a source flip: parked at the above-table
  critique.
- BYOD upload and its partial-match repair screen (9.13), which is what adds the third segment.
