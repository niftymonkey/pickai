# The facet-row rail

The decided behavior of the rules rail in the v3 web app. Shape brief confirmed by Mark and
built 2026-09-01; reshaped by him on 2026-09-03 after three heading mocks were looked at one
at a time. This supersedes the prototype's add-a-rule flow (picker, draft forms, Save
buttons); the library rule shapes live in `src/filter/rule.ts`.

## The model

- The rule kinds are permanent, always-visible rows. A rule is a row's live state. There is
  no add flow, no picker, and no draft form anywhere.
- The rail is headed **Model requirements**, with **Clear all** on that same line, shown only
  while at least one rule is applied.
- Five rows sit up top in two groups, each group holding more than one row:
  - **What it must do**: Capabilities, Input & output.
  - **How big, how cheap**: Context floor, Output floor, Price fence.
- **More rules** is a disclosure below them holding Makers, Sellers, Knowledge cutoff and
  No deprecated models. Context floor is not in there; it gets regular use.
- There is **no score floor**. It was deleted along with the source-switch coupling that
  cleared it on a source flip.
- Pipeline order is rail order, top to bottom, fixed. This replaces the prototype's
  order-added pipeline; cut counts attribute in rail order.

## What the rail does not carry

- **No big survivor number and no listings sub-line.** The rail begins at its heading and
  goes straight into the rows. The survivor count lives in the results line above the table;
  each row header still carries its own cut. A visually hidden `aria-live` line keeps the
  count hinge audible with nothing painted for it.
- **No applied-rules chip block.** It was built, looked at, and dropped: with lined-up boxes
  inside the rows, a chip at the top duplicated the control you had just clicked. The boxes
  are the readout.
- **No per-pick cut counts inside a chip or a box.** A count that lives inside a control grows
  it on pick and slides every control after it, which breaks the Reserved Slot Rule in
  `web/DESIGN.md`. The row header's one total is where a count goes.

## Controls inside a row: lined-up boxes

Controls and readouts must not look alike. Chips inside a row read as the same object as the
chips the rail used to stack at the top.

- **Multi-choice rows are checkboxes** in a vertical, left-aligned list: Capabilities,
  Input & output, Makers, Sellers.
- **Single-choice rows are radio buttons** in the same lined-up style: Context floor, Output
  floor, and both sides of Price fence. Knowledge cutoff has no stop list at all, only its
  month field, so it has nothing to line up.
- A radio cannot be un-picked by clicking it again, so **every radio list opens with its own
  off row**: "No floor" for the two floors, "No ceiling" for each price fence. Picking it
  clears the rule.
- A checked row goes to full rail ink; an unchecked row stays dim. State is carried by the
  box and by ink only, never by font weight: bold is wider, and a wider label moves its
  neighbours.
- Makers and Sellers stay searchable checklists of real catalog names with an Only/Never mode
  toggle. No free text, so a typo cannot silently zero the bench.
- No deprecated models is a plain toggle row with nothing to expand.

## Commit model

- Commit is instant everywhere. Boxes apply on click. No Save buttons.
- The price ceilings and the knowledge month are free fields beside their lists that apply on
  Enter or blur. The price fields start empty (no prefilled default). Preset stops are the
  radio rows: input $1 / $5 / $15 / $50, output $5 / $15 / $50 / $150. An unparseable ceiling
  reverts to the applied value; nothing changes silently.
- Clearing a field to empty removes the rule.

## Rows and state display

- At rest a row is one muted line. Active, it speaks its state as a `ruleLabel` sentence
  ("Needs reasoning + tool calling") plus its total cut in both units ("cut 995 models,
  2,359 listings").
- Rows expand in place. **One row is open at a time**: opening a row closes the one before it.
  This is a height lever, chosen alongside the shorter row list. Escape closes an open row and
  returns focus to its header.
- Cut counts follow the derived rules: capability and modality picks are each their own rule;
  Makers, Sellers, and the single-value rows are one rule each. The row header carries the
  row's total.

## Keyboard, focus, announcements

- Row headers are buttons with `aria-expanded`; every control has a keyboard path.
- Focus is never dropped at a seam: committing a fence keeps focus in its field, Clear all
  moves focus to the rail heading, and removing the zero-survivor card's named rule moves
  focus to the row it changed.
- The count hinge and the zero-survivor card announce politely (`aria-live="polite"`) through
  the visually hidden line.
- A row whose state just changed plays a soft accent flash; reduced motion collapses every
  animation to an instant state change.

## Rejected

- **No headings at all** (mock variant A): five rows in one flat list, nothing groups the jobs.
- **The old three headings with More as a third** (mock variant C): it leaves Price fence
  alone under "Cost and housekeeping", and a heading over a single row is a container holding
  one thing.
- **Letting the rail scroll itself** as the height lever. Offered and refused.

## Deferred by slice plan

- Saved rules, resume, and presets: slice E.
- Shortlist and the mobile bottom bar and drawer: slice F.
