# The facet-row rail

The decided behavior of the rules rail in the v3 web app. Shape brief confirmed by Mark and
built 2026-09-01. This supersedes the prototype's add-a-rule flow (picker, draft forms, Save
buttons); the library rule shapes live in `src/filter/rule.ts`.

## The model

- The nine rule kinds are permanent, always-visible rows. A rule is a row's live state. There
  is no add flow, no picker, and no draft form anywhere.
- Rows sit in three quiet groups: "What it must do" (Capabilities, Input & output, Context
  floor, Output floor), "Who made it, who sells it" (Makers, Sellers), "Cost and housekeeping"
  (Price fence, Knowledge cutoff, No deprecated models).
- Pipeline order is rail order, top to bottom, fixed. This replaces the prototype's
  order-added pipeline; cut counts attribute in rail order.

## Commit model

- Commit is instant everywhere. Toggles, stops, and checkboxes apply on click. No Save
  buttons.
- The price ceilings and the knowledge month are free fields that apply on Enter or blur. The
  price fields start empty (no prefilled default) and carry preset stops beside them: input
  $1 / $5 / $15 / $50, output $5 / $15 / $50 / $150. An unparseable ceiling reverts to the
  applied value; nothing changes silently.
- Clicking an active stop clears it. Clearing a field to empty removes the rule.

## Rows and state display

- At rest a row is one muted line. Active, it speaks its state as a `ruleLabel` sentence
  ("Needs reasoning + tool calling") plus its total cut in both units ("cut 995 models,
  2,359 listings").
- Rows expand in place; any number can be open at once. Escape closes an open row and returns
  focus to its header.
- Cut counts follow the derived rules: capability and modality picks are each their own rule
  and carry their own inline count; Makers, Sellers, and the single-value rows are one rule
  each and carry one count.
- Makers and Sellers are searchable checklists of real catalog names with an Only/Never mode
  toggle. No free text, so a typo cannot silently zero the bench.
- No deprecated models is a plain toggle row with nothing to expand.

## Keyboard, focus, announcements

- Row headers are buttons with `aria-expanded`; every control has a keyboard path.
- Focus is never dropped at a seam: committing a fence keeps focus in its field, Clear all
  moves focus to the rail heading, and removing the zero-survivor card's named rule moves
  focus to the row it changed.
- The count hinge and the zero-survivor card announce politely (`aria-live="polite"`); the
  tweened number is hidden from the accessibility tree and a visually hidden line carries the
  settled value.
- A row whose state just changed plays a soft accent flash; reduced motion collapses every
  animation to an instant state change.

## Deferred by slice plan

- Saved rules, resume, and presets: slice E.
- Shortlist and the mobile bottom bar and drawer: slice F.
