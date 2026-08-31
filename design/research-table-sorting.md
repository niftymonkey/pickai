# Column sorting UX in dense data tables

Research sweep, 2026-08-30. Primary sources only: the WAI-ARIA spec and Authoring Practices
Guide, design system documentation (Carbon, Polaris, USWDS, Material, SAP Fiori), data grid
vendor docs (AG Grid, TanStack Table, Angular Material), and product documentation (Linear,
Stripe). Written against the current `web/components/results-table.tsx` implementation and the
constraints in `design/v3-north-star.md` and `web/PRODUCT.md`.

---

## What the standards say

### Markup and semantics (ARIA spec, APG)

The ARIA 1.2 spec defines `aria-sort` for `columnheader` and `rowheader` roles, with values
`ascending`, `descending`, `none`, and `other`. Two normative points matter: authors SHOULD
apply it only to header cells, and SHOULD apply it to **only one header at a time** per table
(<https://www.w3.org/TR/wai-aria-1.2/#aria-sort>). That second point means multi-column sort
has no clean standard way to be communicated to assistive technology.

The APG Sortable Table example
(<https://www.w3.org/WAI/ARIA/apg/patterns/table/examples/sortable-table/>) is the canonical
pattern:

- Plain HTML `<table>` markup; the header text of each sortable column is wrapped in a
  `<button>`. Keyboard support then comes free from the browser.
- `aria-sort` is set on the currently sorted column only, and removed when the sorted column
  changes.
- Direction icons are character entities (▲ and ▼) so they survive high-contrast inversion,
  and they carry `aria-hidden="true"` so they do not pollute the button's accessible name.
- An optional convention marks sortable-but-unsorted columns with an icon whose **shape**
  differs from the direction arrows (their example uses ♢), "so people with visual impairments
  can easily distinguish them": a difference of color and size alone is not enough.
- The click target fills the entire header cell (label plus icon), and hover styles the whole
  button, so it reads as one interactive element.
- A single off-screen description of the sort behavior is appended to the table caption,
  instead of repeating it on every header button, "to prevent repetitious verbosity."

### Announcing the change

Two independent sources say `aria-sort` alone is not enough feedback:

- Angular Material's accessibility notes: "most screen readers do not announce changes to the
  value of `aria-sort`, meaning that screen reader users do not receive feedback that sorting
  occurred," so they recommend announcing sort changes through a live announcer, and giving
  each header button an explicit action description like "Sort by last name"
  (<https://github.com/angular/components/blob/main/src/material/sort/sort.md>).
- USWDS requires an `aria-live` region immediately following the table that announces sort
  state changes, and auto-generates `aria-label`s on sortable headers that update to reflect
  the current state (<https://designsystem.digital.gov/components/table/>).

### Click cycles: what is actually standard

There is no single standard cycle. The documented options:

- **AG Grid** defaults to `ascending -> descending -> none` and exposes `sortingOrder` per
  column to change it; their own docs demonstrate desc-first columns, asc-only columns, and
  cycles without the none state (<https://www.ag-grid.com/javascript-data-grid/row-sorting/>).
- **Angular Material** defaults to `asc -> desc -> clear`, with `matSortStart="desc"` to flip
  the entry direction and `disableClear` to remove the cleared state
  (<https://github.com/angular/components/blob/main/src/material/sort/sort.md>).
- **TanStack Table** cycles through a none state by default but ships
  `enableSortingRemoval: false` for exactly the two-state case, with the stated rationale
  "if you want to ensure that at least one column is always sorted"
  (<https://tanstack.com/table/v8/docs/guide/sorting>).
- **Polaris DataTable** models only two directions plus none in its `onSort` callback, with a
  configurable `defaultSortDirection` for the first click (default ascending)
  (<https://polaris.shopify.com/components/tables/data-table>).
- **Carbon** names three states (unsorted, sorted-up, sorted-down) and shows the direction
  icon only on the sorted column; unsorted columns reveal a neutral arrows icon on hover
  (<https://carbondesignsystem.com/components/data-table/usage/>).

So the tri-state cycle with a "none" stop is the default in analysis grids, and every serious
implementation also ships a supported way to drop the none state. The none state only earns
its place when the unsorted row order means something (insertion order, server order). When it
does not, the vendors themselves recommend removing it.

### Default direction per data type

TanStack Table is the clearest primary source that documents this as behavior, not opinion:
"the first sorting direction ... is ascending for string columns and descending for number
columns," configurable via `sortDescFirst`
(<https://tanstack.com/table/v8/docs/guide/sorting>). The underlying principle is that the
first click should land on the extreme the user most plausibly came for: A-first for names,
biggest-first for quantities, newest-first for dates.

For low-is-better numbers (prices, ranks, latencies) the same source documents
`invertSorting`, "useful for values that have an inverted best/worst scale where lower numbers
are better, eg. a ranking (1st, 2nd, 3rd) or golf-like scoring." That is the documented
articulation of "prices sort ascending first": not a special rule for money, but the general
rule that the useful extreme comes first, and for cost the useful extreme is cheap.

TanStack also documents missing-value placement: `sortUndefined` defaults to pushing undefined
values to the end of the list, with `'first'`/`'last'` overrides. pickai's "unknown never
ranks" behavior is a stricter version of the ecosystem default, not an eccentricity.

### Two other spec-level notes worth keeping

- Alignment is part of the sorting story because it is what makes a sorted column scannable:
  Polaris hard-codes "Numerical = right aligned, textual = left aligned, don't center align"
  (<https://polaris.shopify.com/components/tables/data-table>), and USWDS adds right-aligned
  monospace for numeric data (<https://designsystem.digital.gov/components/table/>). pickai
  already does both.
- USWDS: "Add row sorting to individual columns of long tables where the data can be logically
  ordered," and never on the stacked (card-list) mobile variant, "because the column headers
  at the top of the table don't appear at narrow widths"
  (<https://designsystem.digital.gov/components/table/>).

### Where Material stands

Material 3 has no data table component; the M2 data tables spec page now redirects to an
"upgrade to Material 3" notice (<https://m2.material.io/components/data-tables>). Material's
living sorting guidance is in its implementations: MDC Web's data table puts
`aria-sort="none"` on sortable unsorted headers, uses an icon button with an explicit
`aria-label` ("Sort by dessert") plus a visually hidden sort status label, and flips the icon
with direction
(<https://github.com/material-components/material-components-web/blob/master/packages/mdc-data-table/README.md>);
Angular Material's sort header is covered above.

---

## What the high-craft products do

### Linear

Linear has **no column-header sorting at all**. Ordering lives in the Display options menu
(Shift V): pick one ordering property (status, priority, last created, last updated, due date,
manual, ...) and optionally "reverse the sort order," except when sorting manually
(<https://linear.app/docs/display-options>). One axis at a time, one meaningful direction with
a single reverse toggle, no none state, no multi-sort, and the control is identical at every
viewport because it never depended on a header row. Their status ordering is also opinionated
rather than alphabetical: "closest to done -> farthest from done, followed by completed and
canceled," which is a domain-meaningful direction, not a data-type default.

### Stripe Dashboard

Stripe's documented table pattern (the connected accounts list) is quiet, conventional
header sorting: "you can sort it by clicking any column heading that has a sort icon (↕)"
(<https://docs.stripe.com/connect/dashboard/viewing-all-accounts>). The ↕ glyph marks which
columns are sortable; filters and tabs carry the heavy lifting of narrowing, and an Edit
columns control manages density. No documented multi-sort. The lesson from both Linear and
Stripe: high-craft products treat sorting as a small, legible instrument and put the power
into filtering.

### AG Grid (analysis-grade grid)

Sorting on by default for every column, `asc -> desc -> none` cycle, per-column override.
Multi-column sorting is **shift-click** by default, switchable to ctrl/cmd via
`multiSortKey='ctrl'`, suppressible entirely (`suppressMultiSort`), or forced always-on
(`alwaysMultiSort`) (<https://www.ag-grid.com/javascript-data-grid/row-sorting/>). Rows
animate to their new positions after a sort by default (`animateRows`), which is their answer
to "where did my row go."

### TanStack Table (headless standard)

Multi-sort is shift-click by default, with `maxMultiSortColCount` to cap depth and
`column.getSortIndex` expressly for "showing a badge or indicator of the column's sort order
in a multi-sort scenario" (<https://tanstack.com/table/v8/docs/guide/sorting>). That badge is
the accepted answer to multi-sort legibility: without a numbered indicator per header,
stacked sorts are invisible.

### SAP Fiori (enterprise, mobile-serious)

For manageable tables, sort does not live in headers at all: a Sort icon button in the table
toolbar opens a view settings dialog listing sortable fields with direction. The dialog "uses
the full screen on smartphones"
(<https://www.sap.com/design-system/fiori-design-web/v1-136/ui-elements/view-settings-dialog/usage>).
This is the same shape as Polaris IndexFilters, whose sort button opens a list of
field-plus-direction options with human `directionLabel`s ("Ascending"/"Descending") per pair
(<https://polaris.shopify.com/components/selection-and-input/index-filters>).

### Small-screen patterns, summarized across sources

When the table becomes a card list, header sorting has nothing to attach to (USWDS says this
outright), so the sort control becomes a standalone widget. The documented shapes:

1. **Sort menu/popover from a toolbar button** listing field-plus-direction pairs (Polaris
   IndexFilters, Fiori view settings dialog; the flight-search sites in PRODUCT.md's
   references use the same shape).
2. **A single ordering picker plus a reverse toggle** (Linear Display options).
3. **A native select**, the zero-dependency version of shape 2, which is what pickai ships
   today. Nothing in the sources argues against it; it is the accessible baseline.

Segmented controls only appear in these sources for switching dialog tabs (Fiori), not as sort
direction controls; with seven axes, a chip row or segmented control would also fight for
space that a select or popover does not need.

---

## Implications for pickai

The current model (click a header to pick the axis; each axis has one fixed, best-first
direction; unknown always sorts last; mobile uses a native select) is closer to Linear than to
AG Grid, and that is the right neighborhood: north-star rule 4 says the user picks the axis,
and the product is a shortlisting instrument, not a pivot table. The gaps are in feedback and
in one accessibility bug, not in the model.

### 1. Click cycle: two-state toggle, never a none state

Add a direction reversal on repeated click of the active header: first click always lands on
the axis's best-first direction (current behavior), second click reverses, third returns.
Never cycle through "none": the underlying row order is arbitrary catalog order, which is
exactly the case TanStack's `enableSortingRemoval: false` and Angular Material's
`disableClear` exist for. Today a second click on the active header does nothing, which
violates the expectation set by every product surveyed. Reversal also answers real questions
cheaply (oldest cutoff first to find stale models, widest price first to see the ceiling).

One rule diverges from naive reversal and should be stated in code and copy: **unknown sorts
last in both directions.** Reversing "cheapest first" must not surface "price unknown" rows
first; the unrated/unknown partition stays at the bottom regardless of direction (north-star
rule 1).

### 2. Direction words, not asc/desc

Label the active direction in domain words, the way Polaris `directionLabel` and Linear's
domain-meaningful orderings do: "best first," "cheapest first," "newest first," and on
reversal "worst first," "priciest first," "oldest first." This fits the instrument register
and doubles as the announcement text (see 5).

### 3. Indicators

Today the only signal is a color change on the active header label. Per APG and Carbon:

- Show a direction arrow (▲/▼ or equivalent) on the active header, `aria-hidden="true"`.
- Give sortable headers a visible affordance distinct **in shape** from the direction arrows:
  either Carbon's reveal-on-hover neutral icon or Stripe's always-visible ↕. With every data
  column sortable here, hover-reveal keeps the header calm; the pointer cursor and hover state
  already present help.
- Make the whole header cell the click target (APG maximizes the button to fill the cell);
  the current button wraps only the label text.

### 4. Fix the aria-sort bug

`results-table.tsx` sets `aria-sort="descending"` on the active header unconditionally, but
`costIn`/`costOut` sort ascending (comparators in `web/lib/engine.ts`). The attribute
currently lies on the two price axes. It must reflect the real direction, and continue to
appear on only one header at a time per the ARIA spec.

### 5. Announce the sort

Add a visually hidden `aria-live="polite"` region that announces changes ("Sorted by In $/M,
cheapest first"), per USWDS and Angular Material's warning that `aria-sort` changes go
unannounced. Since the direction words already exist (see 2), consider making this a small
visible caption of the current ordering; a visible statement of "what order you are looking
at" is provenance in the same spirit as design principle 2. Also add one off-screen
description of the sort behavior at the table caption level (APG technique) rather than per
button.

### 6. Per-axis defaults: keep them, they match the documented practice

Score, context, output, released, cutoff descending and prices ascending is exactly
TanStack's documented default (numbers desc-first) plus its `invertSorting` reasoning for
low-is-better values. No change needed. Keep the rank column defined by the best-first
ordering of the chosen axis, so a reversed view shows the same rank numbers in reverse rather
than renumbering.

### 7. Multi-column sorting: skip it

Multi-sort earns its keep in analysis grids where users build ad-hoc pivots (AG Grid,
TanStack, both via shift-click with numbered badges per header). Everything here argues
against it for pickai: the task is single-axis shortlisting (rule 4 is literally "the user
picks the axis"), Linear and Stripe both decline it, `aria-sort` cannot express it, and the
mobile select cannot either. Ties are better handled by a documented deterministic tiebreaker
(name, then key) so re-runs are stable, which serves the defensibility goal better than a
second sort key the user has to remember they applied. If it is ever added, shift-click is
the convention.

### 8. Mobile: keep the select, carry the direction into it

The native select is the accessible baseline version of the pattern Polaris, Fiori, and
Linear all use (sort control detached from headers; USWDS confirms header sorting cannot
survive the card layout). Two refinements: include the default direction in the option labels
("Score, best first"), and if reversal ships on desktop, pair the select with a small reverse
toggle (Linear's exact model) rather than doubling the option list to fourteen entries.

---

## Source list

- ARIA 1.2, `aria-sort`: <https://www.w3.org/TR/wai-aria-1.2/#aria-sort>
- APG Sortable Table Example: <https://www.w3.org/WAI/ARIA/apg/patterns/table/examples/sortable-table/>
- USWDS Table: <https://designsystem.digital.gov/components/table/>
- Carbon Data table usage: <https://carbondesignsystem.com/components/data-table/usage/>
- Polaris DataTable: <https://polaris.shopify.com/components/tables/data-table>
- Polaris IndexFilters: <https://polaris.shopify.com/components/selection-and-input/index-filters>
- Material 2 data tables (retired, redirects to M3): <https://m2.material.io/components/data-tables>
- MDC Web data table: <https://github.com/material-components/material-components-web/blob/master/packages/mdc-data-table/README.md>
- Angular Material sort: <https://github.com/angular/components/blob/main/src/material/sort/sort.md>
- AG Grid Row Sorting: <https://www.ag-grid.com/javascript-data-grid/row-sorting/>
- TanStack Table Sorting Guide: <https://tanstack.com/table/v8/docs/guide/sorting>
- Linear Display options: <https://linear.app/docs/display-options>
- Stripe, viewing all connected accounts: <https://docs.stripe.com/connect/dashboard/viewing-all-accounts>
- SAP Fiori View Settings Dialog: <https://www.sap.com/design-system/fiori-design-web/v1-136/ui-elements/view-settings-dialog/usage>
- NN/g, Data Tables (consulted for user-task framing): <https://www.nngroup.com/articles/data-tables/>
