# What is left to build in the v3 web rebuild

The canonical, ordered list of work remaining on `web/`. It survives session handoffs on purpose:
`continue-v3-redesign.md` is rewritten every session, this file is not. When an item lands, mark it
DONE here with its commit, and do not delete the line.

Each item names where its substance lives. This file carries the order and the state, never the spec.

## Order

| # | Item | State | Spec lives in |
| --- | --- | --- | --- |
| 1 | **The table.** Six columns and a per-model panel, decided 2026-09-03 and mocked. Folds in the parked width question (the six-column shape is 868px and needs no sideways scroll at 1024) and the section 1 leftovers of the review. | **BUILT 2026-09-03, not committed** | **`web/design/results-table.md`**; `web/design/review-2026-09-02.md` section 1 |
| 1a | **Structured output is an unsafe rule and it is already shipped.** models.dev never states `structured_output` for **35%** of the catalog, so the current rule cuts those models for silence, not for a stated no. The library keeps absent distinct from false (`structuredOutput?: boolean`), so the fix is available: cut on a stated no only. Found 2026-09-03. | NOT STARTED | `web/design/results-table.md` |
| 1b | **Attachments as a rail capability.** The Capabilities row offers reasoning, tool calling, structured output and open weights; `attachment` is published for 49% of the catalog and is missing. Found by Mark 2026-09-03 in the model panel. Safe to gate on: models.dev states it for 100% of the catalog. `web/design/facet-rail.md` needs the row rewritten when it lands. | NOT STARTED | `web/design/facet-rail.md` |
| 2 | **Cost as a weight.** Cost survives only as the rail's hard price fence; v1 and v2 had `costEfficiency` as a weighted criterion and v3 deleted the built-ins. A fence and a weight are different promises. Mark raised it and wants it. Four open design questions. | NOT DESIGNED | `web/design/score-surface.md`, first Deferred item |
| 3 | **Measure real Artificial Analysis coverage** against the folded catalog. The shipped app offers three AA categories; the prototype's six were invented. | NOT STARTED | `web/design/score-surface.md` |
| 4 | **The remaining review batch.** Section 2 (contrast against the project's own AA floor) is the next unspent one, then sections 3-5. | NOT STARTED | `web/design/review-2026-09-02.md` |
| 5 | **Slice D: sorting.** Plus the rank column and the per-axis unrated interleave deferred from slice C. | NOT STARTED | `prototypes/web/design/sorting-spec.md` (approved) |
| 6 | **Slice E: presets, ghost-chip flight, saved-rules resume, theme switcher**, plus the browser-side last-good score copy in `localStorage`. Tokens and the `html[data-theme]` hook already exist in `web/app/globals.css`. ONE key, no chunking (curated six-category arena set is 276 KB; budget ~5 MB). Order: live fetch, server memory, browser copy, committed floor, and the caption says which one is on screen. Open: whether it holds the AA set too. | NOT STARTED | `prototypes/web/design/ui-inventory.md` |
| 7 | **Slice F: shortlist, reorder, mobile bottom bar and drawer.** The review's 375-width findings live here, plus the DOM reorder so `main` precedes `aside`. | NOT STARTED | `prototypes/web/design/ui-inventory.md` sections 4, 6 |
| 8 | **The parked shapes:** code export detail, then BYOD upload with the partial-match repair screen (9.13). BYOD is what adds the third score-source segment. | NOT STARTED | `design/v3-decisions.md` 9.13 |
| 9 | **The owed catch-up ticket and PR:** the v2 tree under `src/` brought up to the coding rules, and the docs site refreshed off the v2 API. Its own ticket and its own PR, not this branch. Draft title and body for Mark's review first. | OWED | `.claude/rules/code-core.md` |
| 10 | **Open the web-rebuild PR** once the slices are far enough along. The merge waits for a CodeRabbit review of the exact commit being merged (GitHub app, public repo). | BLOCKED on 1-7 | working agreement |

## Standing notes on this list

- Items 1-7 are the app. Item 8 is the next product surface. Items 9-10 are the way out of the branch.
- A UX polish pass is not on this list. The agreement (Mark 2026-09-02) is one evaluation pass, one
  ranked batch (item 4), then slices. Broad polish waits for the full app.
- Every dispatch that touches the app names the `prototypes/web/design/ui-inventory.md` items it
  covers, defers, or drops with sign-off. That rule outlives this file.
