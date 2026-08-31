# Sorting spec for the decision surface

Status: approved direction, not yet built. Derived from `design/research-table-sorting.md`
(primary-source research, 2026-08-31); this file is the buildable description. When this ships,
the aria-sort fix already in `results-table.tsx` becomes part of this behavior.

## Behavior

1. **One click sorts, with the axis's own smart default.** Score: best first. Prices: cheapest
   first. Context and max output: biggest first. Dates: newest first. These match the current
   defaults; nothing moves on day one.
2. **A second click on the same column flips the direction.** That is the entire cycle. There is
   no third "unsorted" click: this table has no meaningful unsorted order, and the research shows
   every major grid documents disabling that state for exactly this case.
3. **Unknown values sink to the bottom in both directions.** Flipping reverses the comparison of
   known values only; the missing-last branch never inverts. Unknown never ranks (rule 1).
4. **No multi-column sort.** Ties break deterministically: equal values fall back to score
   (best first), then name A-Z. The tiebreaker is stated in the UI caption's tooltip, not hidden.
5. **Direction is said in words, not just an arrow.** A visible caption near the table reads
   "Sorted by input $/M, cheapest first." It sits in an `aria-live="polite"` region because
   screen readers do not announce `aria-sort` changes (Angular Material and USWDS both warn
   this). The caption doubles as the human explanation.

## Direction words per axis

| Axis | Default | Flipped |
|---|---|---|
| Score | best first | worst first |
| In $/M, Out $/M | cheapest first | priciest first |
| Context, Max out | biggest first | smallest first |
| Released, Cutoff | newest first | oldest first |

## Implementation shape

- **State:** `axis: SortAxis` stays; add `flipped: boolean`. Clicking a new column sets the axis
  and resets `flipped` to false; clicking the active column toggles `flipped`.
- **Engine:** comparators stay built from `lastIfMissing`; a flip negates only the defined-value
  comparison inside it, never the undefined branch. `rankGroups` and the table share the same
  effective comparator so the # column always matches what is on screen.
- **Indicators:** the sorted column header shows one arrow (aria-hidden glyph) pointing with the
  direction; unsorted-but-sortable headers reveal a faint two-way glyph on hover only. The whole
  header cell stays the click target. `aria-sort` reports the true direction (already fixed).
- **Mobile:** the Sort select's option labels carry the default direction word ("Score, best
  first"). A small flip button beside the select toggles `flipped` and the labels update to the
  flipped wording. No header interaction exists on cards, so the select plus flip is the whole
  surface.
- **Unrated bucket:** unchanged. On the score axis the unrated section keeps its hatched divider
  and never interleaves, in either direction.
