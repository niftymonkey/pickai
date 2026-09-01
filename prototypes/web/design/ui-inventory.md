# UI behavior inventory: the web prototype

A factual reference of what the prototype at `prototypes/web/` does, surface by surface, written
against the code as of branch `feat/v3-web-rebuild` and verified live (desktop 1440px, tablet
768px, phone 390px, both themes) on 2026-08-31. Citations are `file:line` within `prototypes/web/`
unless another path is given. This describes what IS, not what the rebuild must do. Three items
the rebuild effort already caught are marked "(already caught)": the 60-row render cap, the
Clear all button, and the add-rule interaction flow.

## 1. Frame, data, and load behavior

- Next.js 16 app, port 3100 (`package.json:6`), one route. The page is `force-dynamic`
  (`app/page.tsx:4`): every request re-runs `loadRated()` on the server, which hits module-level
  caches.
- Data: the models.dev catalog via the pickai library, deprecated models filtered out
  (`lib/catalog.ts:45`), each listing keyed `provider/id` (`lib/catalog.ts:47`). Scores: the
  LMArena style-controlled leaderboard, fetched from the HuggingFace datasets server by paging
  the whole split (~105 pages of 100 rows, 12 in parallel, one retry per page, 20s timeout each,
  capped at 20,000 rows) because the filter endpoint 502s when cold (`lib/benchmarks.ts:110-153`).
  Both fetches cache one promise per server process and clear it on failure so the next request
  retries (`lib/catalog.ts:31-40`, `lib/benchmarks.ts:99-108`). First load per process is slow,
  later loads are instant.
- Six arena categories are kept as blendable metrics: overall, coding, math, hard_prompts,
  creative_writing, instruction_following (`lib/benchmarks.ts:19-26`). The join folds
  reasoning-effort suffixes (-high, -medium, -low, -minimal, -thinking) before matching
  (`lib/benchmarks.ts:189-197`) and carries every rival configuration: `best` is the top-rated
  real config, `min`/`max` the spread, `bestConfig` its name (`lib/benchmarks.ts:204-251`).
- If the arena fetch fails the app still works: models ship unrated and the score source line
  carries the reason (`lib/load-rated.ts:22-32`; rendering in section 3).
- Fonts: Geist Sans and Geist Mono via next/font (`app/layout.tsx:5-13`). Page metadata title
  "pickai" (`app/layout.tsx:15-19`).
- Every color is a token defined once in `:root` as `light-dark(blueprint, night)` pairs
  (`app/globals.css:10-37`). Global `:focus-visible` is a 2px accent outline with 2px offset
  (`app/globals.css:78-81`).
- The little dark circle bottom-left in dev is the Next.js dev-tools badge, not part of the app.

## 2. The engine semantics the UI is built on

The UI renders model GROUPS, not listings. Understanding the surfaces requires these rules:

- **Grouping.** Listings collapse to one row per model identity. The group key is the id,
  lowercased, path prefix stripped to the last `/`, `@`/`:` suffixes stripped, dots turned to
  dashes, and a trailing 8-digit date stripped (`lib/engine.ts:332-344`). The header count
  (1,882 at test time) is groups; PRODUCT.md's "catalog of 3,558" (`PRODUCT.md:14`) counts raw
  listings. The two numbers are both true and the UI only ever shows the group count.
- **Representative listing.** Each group's face is the model's maker when it sells the model
  itself, else any direct-API provider, else the cheapest listing with a known nonzero input
  price, else the first of the pool (`lib/engine.ts:347-369`). A group whose maker never appears
  under the same normalized key is anchored by a reseller (observed live: a "Claude-Sonnet-4"
  group anchored by poe with 16 sellers, separate from the anthropic-anchored Claude Sonnet 4
  group; see section 9).
- **Maker.** Who built the model, inferred from the `family` field or the group-key prefix via a
  17-entry hand map (`lib/engine.ts:288-330`); a comment marks this as a stand-in for the
  library's unexported inferProvider (the 9.29 gap). `KNOWN_MAKERS` (14 unique values, sorted)
  feeds the maker rule form (`lib/engine.ts:330`).
- **Rules.** Seven kinds: provider allow/exclude, maker allow/exclude, capability (reasoning,
  toolCall, structuredOutput, openWeights), modality, minContext, minOutput, costFence
  (`lib/engine.ts:18-25`). Rules test the representative listing, except provider rules, which
  prune sellers inside the group and kill the group only when no seller remains; pruning can
  change the group's rep (`lib/engine.ts:86-104`). A maker rule on an unknown maker fails an
  allow and survives an exclude (`lib/engine.ts:64-69`). A cost fence never cuts an unknown
  price (`lib/engine.ts:57`, `lib/engine.ts:79-82`, decision 9.23 cited in code).
- **Pipeline.** Rules run in the order added; each step records how many groups it cut and how
  many remain (`lib/engine.ts:131-151`). `explainCut` finds the first rule that removes a given
  group (`lib/engine.ts:106-117`).
- **Sorting.** Seven axes: score, costIn, costOut, context, output, released, cutoff
  (`lib/engine.ts:210-227`). Prices sort ascending, everything else descending; a value the
  model lacks always sorts last ("unknown never ranks", `lib/engine.ts:230-244`). Context or
  output of 0 counts as missing (`lib/engine.ts:250-251`). There is no direction flip and no
  tiebreaker; `design/sorting-spec.md` describes both as approved but explicitly "not yet
  built" (`design/sorting-spec.md:3`).
- **Ranking.** Rank is a group's position within the full rule-filtered set on the current
  axis; groups with no value on the axis get no rank at all (blank rank cell)
  (`lib/engine.ts:391-408`). Search narrowing does not renumber: a searched row keeps its
  full-list rank.
- **Blending.** Weights over metric names; one active metric passes its rating through
  unchanged, two or more produce a weighted rounded blend whose `bestConfig` becomes "N
  metrics", `configs` 1, `votes` undefined (`lib/engine.ts:158-204`). `blendUsed`/`blendWanted`
  record how many weighted metrics the model actually had.
- **Formatting.** Tokens: >= 1M prints `1M` or `1.5M` (one decimal only when fractional), >=
  1,000 rounds to `NK`, below that prints raw (`lib/engine.ts:414-421`). Live consequences:
  1,000,000 prints "1M" while 1,048,576 prints "1.0M" side by side; a 983K context prints
  "983K"; tiny values print raw ("128", "384"); values just under a million can print "1000K"
  (rounding, no promotion to M). Rates: `$0`, three decimals under $0.10, two under $10,
  rounded integer at $10 and up (`lib/engine.ts:423-428`). Price multiples: `×1` under 1.05,
  one decimal under 10, rounded above (`lib/engine.ts:430-437`).

## 3. Desktop surfaces (lg: 1024px and up)

Layout: a 1600px-max two-column grid, 270px rail plus fluid main column
(`components/decision-surface.tsx:267,277`).

### 3.1 Header

`h1` "pickai" with the tagline "Filter, sort, and shortlist AI models. Every number shows its
source."; the tagline is hidden below the sm breakpoint (`components/decision-surface.tsx:268-275`).

### 3.2 The rail (left column)

A dark rounded panel (`bg-rail-bg`, its own surface in both themes per the Dark Rail Rule,
`DESIGN.md:151-167`), sticky at top-6 so it stays put while the table scrolls
(`components/decision-surface.tsx:278-281`). It carries `id="rules-home-desktop"`, the landing
target for preset ghost-chip flights (`lib/fly.ts:7`). Three stacked sections:

**Count hinge** (`components/count-hinge.tsx:33-62`): the survivor count in 4xl mono
(display type appears nowhere else, `DESIGN.md:179`). With zero rules the caption reads "models
in the catalog, before any rules"; with rules, "of 1,882 models pass your rule" (singular) or
"rules" (plural). The number tweens to new values over 360ms with quartic ease-out via
requestAnimationFrame, jumping instantly under reduced motion (`components/count-hinge.tsx:3-30`).

**Rule rail** (`components/rule-rail.tsx`), a labeled region "Your rules":

- Header row: "YOUR RULES" plus a "Clear all" text button that appears only when at least one
  rule exists (`components/rule-rail.tsx:95-103`). (Already caught.)
- One card per rule, in pipeline order: the rule's label, an `×` remove button
  (aria-label "Remove rule: {label}"), and a cut line reading either "cut nothing" or
  "cut N models, M left" with mono numbers (`components/rule-rail.tsx:106-144`). The card whose
  id matches the last-added rule plays the `rule-fire` flash: accent-soft background and accent
  outline fading over 700ms (`components/rule-rail.tsx:110-112`, `app/globals.css:111-125`).
  Rule labels come from `ruleLabel` (`lib/engine.ts:34-55`): "Only anthropic, openai" /
  "Never ...", "Only made by ..." / "Never made by ...", "Needs reasoning", "Takes image input",
  "Context ≥ 200K", "Output ≥ 64K", "Input ≤ $50/M".
- With no rules and the picker closed: "No rules yet. The whole catalog is on the bench."
  (`components/rule-rail.tsx:146-150`). This hint hides while the picker is open.
- Resume button: "Pick up last session's rules (N)", accent-bordered, shown only when there are
  zero rules AND localStorage holds a saved set (`components/rule-rail.tsx:152-160`). It
  disappears the moment any rule exists.
- "+ Add a rule", a dashed-border button (`components/rule-rail.tsx:162-170`). The full flow it
  opens is in section 5.1. (Already caught.)

**Shortlist** (`components/shortlist.tsx`), a labeled region: "SHORTLIST" heading, the caption
"Your fallback chain, in order.", then either a dashed empty-state box ("Pin models from the
results to build a chain worth testing.") or an ordered list of pinned models. Each entry shows
its 1-based position in accent mono, name, provider, and three controls: move up (disabled at
the top), move down (disabled at the bottom), remove (`components/shortlist.tsx:24-75`).
Reordering is adjacent swaps only; there is no drag (`components/decision-surface.tsx:253-259`).
`design/core-flow-brief.md:62-63` describes drag-or-keyboard reorder; the prototype built only
the buttons. When the list is non-empty a footnote reads "The code export, so this decision can
be re-run later, lands in a later pass." (`components/shortlist.tsx:78-83`).

### 3.3 Main column, top to bottom

**Preset row**, present only while there are zero rules (`components/decision-surface.tsx:303-307`).
"Start from a situation:" plus six buttons: New app, Prototyping, Coding agent, Going cheaper,
Forced switch, Self-hosting (`lib/presets.ts:15-68`). On lg the buttons sit right-aligned in a
wrapping row and the hint ("Reasoning, tools, and a big context") lives only in the `title`
attribute tooltip; between sm and lg the hint renders under the name; below sm it is tooltip-only
again (`components/preset-row.tsx:16-31`). Each preset builds visible rules and picks a sort axis,
never deciding invisibly (decision 9.20 cited at `lib/presets.ts:3-7`): New app = toolCall +
structuredOutput, score; Prototyping = input fence $10 + output fence $40, score; Coding agent =
reasoning + toolCall + context ≥ 200K, score; Going cheaper = output fence $15, costIn; Forced
switch = exclude maker anthropic, score; Self-hosting = openWeights, score.

**Search row**: a `type="search"` input, placeholder and aria-label "Find a model in your
results", max-w-sm, and to its right the score provenance line: "Score: LMArena, 2026-08-27",
or on fetch failure "Score: LMArena unavailable (live fetch failed, scores absent this load)"
(`components/decision-surface.tsx:309-323`, `lib/load-rated.ts:26-30`).

**Blend editor** ("SCORE BLEND"), rendered only when more than one metric exists in the data,
so it disappears entirely on a failed arena fetch (`components/decision-surface.tsx:325-331`).
One chip per available metric with minus/plus steppers; active chips (weight > 0) show the
weight and take the accent-soft treatment (`components/blend-editor.tsx:37-76`). Weight range is
0 to 5: plus disables at 5, minus disables at 0 and also on the last positive metric, so weight
can never reach all-zeros (`components/blend-editor.tsx:53-54,68`). With two or more positive
weights a summary appends: "= 50% Overall + 50% Coding" (`components/blend-editor.tsx:23-30,77-79`).
Metric order is data-driven: known names in `METRIC_ORDER` first, unknown (future BYOD) names
appended alphabetically (`components/decision-surface.tsx:69-81`). Default weight: overall = 1
(`components/decision-surface.tsx:65-67`).

**Cut-matches panel**, only while a search query is non-empty and matching models were removed
by rules: a card titled "In the catalog, but cut by your rules:" listing up to 5 models as
"{name} removed by {rule label}", with the fallback text "a rule on its other listings" when no
single rule explains the cut (`components/decision-surface.tsx:333-350`, limit at
`components/decision-surface.tsx:167-175`). When a search matches nothing at all (no survivors
and no cut matches) the message is "No model by that name in the catalog."
(`components/decision-surface.tsx:351-357`). Note `core-flow-brief.md:69` asked for
value-level messages ("removed: input $100/M is above your $50 ceiling"); the prototype names
the rule, not the value comparison.

**Zero-survivor panel**: when rules cut everything, the entire table area (including its footer)
is replaced by a card: "Your rules cut everything." / "'{label}' cut the most (N models).
Loosen it, or remove it." plus a one-click "Remove '{label}'" button
(`components/decision-surface.tsx:359-378`). The biggest cutter is the step with the largest
cut, not the last rule (`components/decision-surface.tsx:261-264`). Search, blend editor, and
the cut-matches panel remain usable above it.

**Results table**: section 4.

### 3.4 Floating elements

**Theme switcher** (`components/theme-switcher.tsx`): a fixed pill, bottom-right (bottom-4
right-4 on lg; bottom-16 right-3 below lg so it clears the mobile bar), with three
`aria-pressed` buttons: System, Light, Dark. System follows the OS; Light forces Blueprint;
Dark forces Night. The choice persists in localStorage key `pickai-theme` and is mirrored to
`html[data-theme]`, which flips `color-scheme` so every `light-dark()` token follows
(`components/theme-switcher.tsx:17-34`, `app/globals.css:39-45`). This is the only element with
a small shadow (`shadow-sm`), per the Flat-By-Default Rule (`DESIGN.md:192-202`).

## 4. The results table (desktop) and its rendering nuances

The table lives in a rounded card with `overflow-x-auto` (`components/results-table.tsx:147`).

- **Columns**: `#`, Model, Score, In $/M, Out $/M, Context, Max out, Released, Cutoff, and an
  unlabeled pin column (sr-only "Pin") (`components/results-table.tsx:36-44,149-188`). Numeric
  columns are right-aligned; Score is left-aligned.
- **Sortable headers**: every column except `#`, Model, and Pin is a button; clicking sets the
  axis (one click, no direction flip; see section 2). The active header text turns accent
  (`components/results-table.tsx:174-183`). The `th` carries `aria-sort` "ascending" for the
  two price axes, "descending" otherwise, only on the active column
  (`components/results-table.tsx:163-169`).
- **Rank column**: header is an `abbr` "#" whose title reads "Rank in your full list by
  {axis label}" (`components/results-table.tsx:151-155`). Cells show the full-list rank in mono
  xs; blank when the model has no value on the axis.
- **60-row cap**: only the first 60 rows render (`VISIBLE_ROWS`,
  `components/results-table.tsx:16`); when more survive, a footer under the table reads
  "Showing the first 60 of 913 models. Add rules to narrow the bench."
  (`components/results-table.tsx:233-239`). (Already caught.)
- **Unrated bucket**: on the score axis only, rated and unrated split; unrated groups sit below
  a full-width hatched divider row: "Unrated: no measured score (813 models). Absent data ranks
  nowhere." (`components/results-table.tsx:70-73,204-213`). Unrated rows below the divider
  render only within what remains of the 60-row budget after the rated rows
  (`components/results-table.tsx:214-228`), so with 60+ rated survivors the divider states a
  count but shows zero unrated rows. On every other axis unrated models interleave wherever
  their axis value ranks them (e.g. $0 listings lead the price sorts) and models missing the
  axis value sink to the bottom. `core-flow-brief.md:54` says the unrated bucket is "always
  present"; in the prototype it exists only on the score axis.
- **Model cell**: name (truncating, with `title` for the full name), provider slug in mono
  underneath, and, when resellers exist, an inline "· 5 sellers" button that toggles to "hide
  sellers" with `aria-expanded` (`components/results-table.tsx:302-323`). Clicking anywhere on
  the row also toggles expansion (the row gets `cursor-pointer` only when there are extra
  sellers), with `stopPropagation` on the inner buttons; the keyboard path is the seller button
  itself, the row click is pointer-only convenience (`components/results-table.tsx:291-297,309-321`).
- **Expanded seller rows**: every seller except the rep, sorted alphabetically by provider, as
  shaded sub-rows (bench-2): provider slug, the phrase "same model, this seller", its own in/out
  prices, context, and output, with plain-text "unknown" for gaps (no hatch chip in sub-rows),
  and no score, dates, or pin cells (`components/results-table.tsx:396-428`). Exclusion is by
  listing key, not provider name, so a provider with multiple listings of the same model shows
  multiple identical-looking rows (observed: "llmgateway-providers" three times under Claude
  Fable 5).
- **Score cell**: the best rating in mono, next to an aria-hidden band: a 64px track with a
  filled span from `rating.low` to `rating.high`, positioned on a scale spanning the lowest low
  to the highest high among rated survivors currently on screen, minimum width 3%
  (`components/results-table.tsx:21-31,79-85,328-346`). Under the number, a context note
  (`components/results-table.tsx:273-287`): for a single-metric score, "25,824 votes", plus
  "2 configs, 1497-1505 (best: claude-opus-4-6-high)" when rival configurations exist; for a
  blend of 2+ metrics, only a shortfall note "1/2 weighted metrics" and only when the model is
  missing some weighted metrics (a complete blend shows no note, and votes are never shown for
  blends). Unrated models get the hatched "unrated" chip.
- **Price cells**: formatted rate, plus a price multiple ("×16") against the cheapest known
  nonzero rate among survivors' reps, per side. Multiples render only when 50 or fewer groups
  survive; the pinned comment explains: multiples compare against "your list", and a list
  longer than that is not one (`components/results-table.tsx:18-19,74-77,430-452`). $0 rates
  get no multiple and never count as cheapest (`components/results-table.tsx:447`,
  `lib/engine.ts:439-450`). Unknown prices render the hatched chip "price unknown".
- **Context / Max out**: token-formatted mono, hatched "unknown" chip at 0. **Released /
  Cutoff**: raw ISO-ish date strings in xs mono, hatched "unknown" chip when absent
  (`components/results-table.tsx:361-372`).
- **Pin button**: bordered icon button per row, `aria-pressed`, aria-label "Pin {name} to
  shortlist" / "Unpin {name}"; pinned state fills the icon and takes the accent-soft treatment
  (`components/results-table.tsx:374-393`, `components/pin-icon.tsx`).
- **Hover**: rows tint to bench-2; header sort buttons and most controls have 150ms color
  transitions.
- **Unknown treatment**: the hatched chip (diagonal-stripe `.hatch` background plus lowercase
  label) is the designed unknown state (`app/globals.css:88-95`, `DESIGN.md:234-237`); it
  appears in main-row cells and the unrated divider. Seller sub-rows and the mobile card fact
  grid print plain "unknown" text without the hatch.
- **Tabular numerals**: every measured value carries `.tnum` mono (`app/globals.css:83-86`).

## 5. Flows

### 5.1 Add a rule (already caught, recorded here in full)

Entry: "+ Add a rule" in the rail (or drawer). The flow is two stages inside the rail, never a
modal (`components/rule-rail.tsx:80-212`):

1. **Category picker.** The button is replaced by a card listing 9 rule types in three titled
   groups (`components/rule-rail.tsx:30-55`): "What it must do" (Capability, Input type, Min
   context, Min output), "Who made it" (Only these makers, Never these makers), "Who sells it,
   what it costs" (Only these sellers, Never these sellers, Price fence). A Cancel link closes
   back to the "+ Add a rule" button. While the picker is open the "No rules yet" hint hides.
2. **Draft form**, replacing the picker per chosen type:
   - **Capability** (`components/rule-rail.tsx:309-327`): "Needs which capabilities? Toggle all
     that apply." Four `aria-pressed` toggle buttons (reasoning, tool calling, structured
     output, open weights). Multi-select; the submit button reads "Add rule" (disabled at zero
     chosen) or "Add 2 rules", and each chosen capability becomes its OWN rule with its own cut
     count (`components/rule-rail.tsx:246-278`).
   - **Input type** (`components/rule-rail.tsx:329-339`): same toggle form; options are the
     modalities actually present in the catalog, sorted (observed: audio, image, pdf, text,
     video; `components/decision-surface.tsx:181-184`). Also one rule per selection.
   - **Min context / Min output** (`components/rule-rail.tsx:341-363`): four preset stop
     buttons (context: 32K, 128K, 200K, 1M; output: 8K, 16K, 64K, 128K,
     `components/rule-rail.tsx:18-19`). Clicking a stop adds the rule IMMEDIATELY; there is no
     confirm step and no free-entry value.
   - **Makers / Sellers, allow or exclude** (`components/rule-rail.tsx:365-425`): a single
     comma-separated text input (label e.g. "Only these makers (comma-separated)", placeholder
     "anthropic, openai") backed by a `datalist` of valid options (makers: the 14
     `KNOWN_MAKERS`; sellers: every provider slug in the catalog). It is a form: Enter submits,
     as does the "Add rule" button (disabled while empty). All entries land in ONE rule
     ("Only made by anthropic, openai"). Entries are trimmed but not validated against the
     option list; a typo produces a rule that cuts everything it fails to match.
   - **Price fence** (`components/rule-rail.tsx:432-496`): explanation text "Cut models with a
     known price above this. Unknown prices are never cut by a fence.", an input/output side
     toggle (input default), and a ceiling text input ("Ceiling, $ per 1M tokens") defaulting
     to "50", `inputMode="decimal"`. Submit disabled unless the value parses to a finite
     positive number. Enter submits.

   Cancelling a draft form returns to the CATEGORY PICKER (stage 1), not all the way out
   (`components/rule-rail.tsx:209`); the picker's own Cancel closes the flow.

Exit: on add, both stages close, the new rules append to the pipeline end, the last added rule
plays `rule-fire`, the count tweens, and the rule set is saved (`components/rule-rail.tsx:83-87`,
`components/decision-surface.tsx:205-211`).

### 5.2 Edit, remove, clear

There is **no in-place edit** of a rule: changing a value means removing the rule and adding a
new one. (The "Forced switch" preset hint even says "Exclude the maker you are leaving, then
edit it", `lib/presets.ts:55`, but the only edit path is remove-and-re-add.) Remove is the `×`
on each rule card; it saves the shrunken set (`components/decision-surface.tsx:213-217`).
"Clear all" empties the working rules but deliberately does NOT touch the saved set
(`components/decision-surface.tsx:219-221`; `lib/saved-rules.ts:33-39` never writes an empty
set), which is exactly what makes "pick up last session's rules" appear right after a clear.

### 5.3 Presets

Clicking a preset REPLACES the current rule set (it can only appear at zero rules), sets the
preset's sort axis, saves, and launches the ghost-chip flight
(`components/decision-surface.tsx:228-235`): one fixed-position chip per rule label, created at
the clicked button's rect, animated 520ms with a 90ms stagger to the first visible rules home
(desktop rail or the mobile Rules button), scaling to 0.8 and fading to 0.15 opacity, then
removed (`lib/fly.ts:19-54`, `app/globals.css:97-109`). The flight is pure show (rules are
already applied) and is skipped entirely under reduced motion or when no target is visible.

### 5.4 Saved rules and resume

Every add, remove, weight change, and preset application persists `{rules, axis, weights}` to
localStorage key `pickai-rules`, but only when the rule set is non-empty
(`lib/saved-rules.ts:33-42`). Two persistence gaps follow from that guard: sort-axis clicks
alone never save (`setAxis` has no save call, `components/decision-surface.tsx:380-388`), and
blend changes made with zero rules are not saved either (`changeWeights` calls `saveRules`,
which early-returns, `components/decision-surface.tsx:223-226`). On a fresh load rules do NOT
auto-apply; the rail offers "Pick up last session's rules (N)" and clicking it restores rules,
axis, and weights, firing `rule-fire` on the last rule (`components/decision-surface.tsx:237-243`).
Malformed storage parses as nothing saved (`lib/saved-rules.ts:44-55`).

### 5.5 Search

Matching is separator-blind: query and haystack are lowercased and stripped to `[a-z0-9]`, so
"gpt5.5" and "GPT 5.5" both find "GPT-5.5" (`components/decision-surface.tsx:42-45`). The query
splits on whitespace and every token must match. Two tiers
(`components/decision-surface.tsx:112-151`): tier 1 is the model's identity (group key, rep
name, maker, and every seller listing's name and id); tier 2 adds incidental facts (provider
slugs, family, input modalities), so "GPT" leads with GPT models rather than everything
nano-gpt resells. Surviving matches keep their full-list ranks but re-sort tier 1 above tier 2
(`components/results-table.tsx:64-69`). Search never changes the count hinge; it filters only
what the table shows. Below the search box, cut matches and the no-match message behave as in
section 3.3. Clearing the input restores the full table. The input is `type="search"`, so the
browser's native clear affordance applies.

### 5.6 Sort

Desktop: header clicks (section 4). Mobile: a labeled "SORT" `select` above the cards with the
seven axis labels (`components/results-table.tsx:89-114`). One click/selection per axis, smart
default direction per axis, no flip anywhere, ties left to the underlying sort's stability.

### 5.7 Pin and shortlist

Pins toggle from any row (desktop) or expanded card (mobile) and persist immediately to
localStorage key `pickai-pins` as an ordered array of listing keys
(`components/decision-surface.tsx:245-251`, `lib/saved-pins.ts`). Pins auto-restore on load
(unlike rules) via `useSyncExternalStore` (`components/decision-surface.tsx:59-64`). The
shortlist resolves pins against the full catalog, so pinned models stay listed even when rules
have cut them from the table (`components/decision-surface.tsx:189-196`). A subtlety from the
key choice: the pin records the REP listing's key, and the row's pinned state checks the current
rep's key (`components/results-table.tsx:199`), so a provider rule that prunes a group's rep to
a different seller makes the row show unpinned while the shortlist entry remains.

### 5.8 Theme

Section 3.4. Persists across reloads; System reflects OS changes live via `color-scheme`.

## 6. Mobile and responsive behavior

Two breakpoints matter: `sm` 640px and `lg` 1024px (`.impeccable/design.json` breakpoints;
Tailwind defaults). Everything below lg gets the phone-shaped layout; 768px differs from 390px
only in the sm-gated extras.

Below lg (`components/decision-surface.tsx:277-460`, `components/results-table.tsx:89-145`):

- The rail does not render. In its place: a fixed bottom bar on the rail surface holding the
  animated survivor count ("913 of 1,882 models") and a "Rules (N)" button carrying
  `id="rules-home-mobile"` so ghost chips fly to it (`components/decision-surface.tsx:393-410`).
  The page gets bottom padding (pb-24) to clear the bar.
- The presets stack as a 2-column grid of card buttons above the search box, full width.
- Search box and score-source line wrap onto separate lines; the blend chips wrap over two rows.
- The table is replaced by a card list (max 60, same cap): each card
  (`components/model-card.tsx`) is one big `aria-expanded` button showing rank, name, provider,
  "· N sellers" (text, not a separate control here), score with votes (or "1/2 metrics" for a
  shortfall blend, or the hatched "unrated" chip), and an In / Out / Ctx fact line. Tapping
  expands in place: the card border turns accent, and a detail panel adds a 2-column fact grid
  (Max output, Released, Cutoff, Inputs), "Also sold by" with the first 3 sellers alphabetically
  plus "+33 more sellers" for the rest, a pin toggle, and a Collapse button
  (`components/model-card.tsx:117-185`). Unknown facts print plain "unknown" (no hatch chip
  except the unrated score chip).
- The sort control is the SORT select (section 5.6). Rank numbers still show on cards.
- On the score axis the unrated divider renders as a hatched paragraph between rated and
  unrated cards, same budget rule as the table (`components/results-table.tsx:125-143`).
- The "Rules (N)" button opens a bottom-sheet drawer: `role="dialog"` `aria-modal="true"`
  labeled "Rules and shortlist", a scrim that is itself a close button (aria-label "Close
  rules"), and a rounded-top sheet capped at 80vh with its own scroll
  (`components/decision-surface.tsx:412-460`). Sheet header: "1,882 of 1,882 models pass"
  (static number, not animated) plus an accent "Done" button. Below: the same RuleRail (full
  add-rule flow, clear all, resume) and Shortlist components as desktop. The drawer has no
  focus trap and no Escape handler; scrim tap or Done closes it. It also does not auto-close
  when a rule is added, so the count in its header updates live. DESIGN.md and
  `.impeccable/design.json` say the drawer casts `shadow-lg` (`DESIGN.md:194-196`); the drawer
  element has no shadow class in code (`components/decision-surface.tsx:425`).
- The theme pill floats above the bottom bar (bottom-16 right-3).

At 768px (still the below-lg layout): the header tagline appears (sm:block) and each preset
button shows its hint text under the name (sm-to-lg only). At 390px both are hidden and preset
hints exist only as `title` tooltips.

Observed at 390px: no horizontal scrolling anywhere; long model names truncate; the bottom bar
count can sit under the Next dev badge (dev-only artifact).

## 7. States over time

- **First visit, catalog only**: full count showing, presets offered, empty rules and
  shortlist, table sorted by score with the unrated bucket below.
- **First load per server process**: slow (the ~105-page arena fetch); later navigations
  instant via module caches. `force-dynamic` means a browser reload still gets fresh joins from
  the cached data. There is no client-side loading spinner; the page arrives server-rendered
  and complete.
- **Hydration beat**: localStorage-backed UI (resume button, shortlist, theme pressed-state)
  renders in its empty server state for an instant before `useSyncExternalStore` re-reads the
  client stores (`components/decision-surface.tsx:59-64,198-203`, server snapshots return
  null). Visible only as a flicker on fast reloads; automation can catch the empty frame.
- **Arena fetch failure**: models render unrated (hatched chips everywhere on the score
  column), the provenance line explains ("Score: LMArena unavailable (live fetch failed,
  scores absent this load)"), the blend editor disappears (only zero-or-one metric available),
  and on the score axis everything sits under the unrated divider. The failed promise is
  dropped so the next request retries (`lib/benchmarks.ts:103-107`). The commit
  `afbae998c8` note "clear the failed catalog cache" covers the same pattern in
  `lib/catalog.ts:35-38`.
- **Zero survivors**: section 3.3.
- **Persistence inventory** (all localStorage): `pickai-rules` (rules + axis + weights, only
  non-empty sets, never auto-applied, offered as resume), `pickai-pins` (ordered keys,
  auto-applied), `pickai-theme` (auto-applied). Malformed values in any of them read as absent
  (`lib/saved-rules.ts:44-55`, `lib/saved-pins.ts:30-44`, `components/theme-switcher.tsx:17-20`).
- **Reduced motion**: a global override collapses every CSS animation and transition to 0.01ms
  (`app/globals.css:127-134`); the count tween runs at duration 0 (`components/count-hinge.tsx:12-13`);
  ghost flights are skipped outright (`lib/fly.ts:21`). Nothing loses function.
- **Themes**: Blueprint (light) and Night (dark) via `light-dark()` tokens; System follows the
  OS. Both themes verified live; the rail stays a darker surface in both.

## 8. Where the prototype differs from its own design docs

- **Sorting**: `design/sorting-spec.md` (direction flip, spoken direction caption,
  aria-live region, tiebreakers, mobile flip button) is approved but not built; the spec says
  so itself (`design/sorting-spec.md:3`). Built today: one-click axis selection with fixed
  smart-default directions and correct `aria-sort`.
- **Shortlist reorder**: brief says drag or keyboard (`design/core-flow-brief.md:62-63`);
  built: up/down buttons only.
- **Fired-gate message detail**: brief asks for value-level explanations
  (`design/core-flow-brief.md:69`); built: rule-level ("removed by Needs reasoning",
  "cut 900 models").
- **Unrated bucket scope**: brief says always present (`design/core-flow-brief.md:54`); built:
  score axis only, interleaved elsewhere (missing values still sink last on every axis).
- **Drawer shadow**: DESIGN.md names `shadow-lg` on the drawer (`DESIGN.md:194-196`); the code
  applies none (`components/decision-surface.tsx:425`).
- **Unknown-chip coverage**: DESIGN.md's Unrated Hue Rule ("never gray-as-afterthought",
  `DESIGN.md:163-165`); seller sub-rows and mobile card facts print plain "unknown" without the
  hatch treatment.
- **Catalog count**: PRODUCT.md's 3,558 (`PRODUCT.md:14`) counts listings; the UI counts model
  groups (1,882 at test time) and never surfaces the listing total.

## 9. Observed oddities (findings, not judgments)

- **Duplicate seller rows**: a provider with several catalog listings of one model shows one
  sub-row per listing; "llmgateway-providers" appeared three times under Claude Fable 5, and
  the same duplication reaches the seller count ("· 37 sellers"). The dedup excludes only the
  rep's exact key (`components/results-table.tsx:396-400`).
- **Split groups**: id normalization does not merge every spelling; observed a
  "Claude-Sonnet-4" group anchored by poe (16 sellers) alongside the anthropic-anchored Claude
  Sonnet 4 group. Because maker inference works by key prefix, maker rules still treat the poe
  group as anthropic-made, so "Only made by anthropic" keeps a poe-fronted row.
- **$0 listings dominate price sorts**: reseller/nvidia $0 catalog entries (a known catalog
  error class) rank first on costIn/costOut, and utility models (embeddings, ASR) are not
  filtered out (observed: All-MiniLM-L12-v2, gliner-pii, Active Speaker Detection).
- **fmtTokens inconsistencies**: "1M" and "1.0M" side by side (exact million vs 1,048,576),
  raw "128"/"384" for sub-1K values, and a possible "1000K" for values just under a million
  (`lib/engine.ts:414-421`).
- **Free-text maker/seller rules accept anything**: the datalist suggests valid slugs but
  nothing validates entries; a typo silently over-cuts (section 5.1).
- **Pin identity is the rep listing's key**: a provider rule that changes a group's rep shows
  the row unpinned while the shortlist keeps the model (section 5.7).
- **Unsaved adjustments**: sort-axis clicks never persist, and blend changes persist only while
  at least one rule exists (section 5.4).
- **Hydration flicker**: resume button, shortlist, and theme pressed-state appear one frame
  late (section 7).
