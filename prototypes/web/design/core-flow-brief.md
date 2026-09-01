# Design brief: the core decision flow

Confirmed by Mark 2026-08-30 via `impeccable shape`. Governed by `web/PRODUCT.md` and
`web/DESIGN.md`. The v3 API surface it builds against is `design/v3-api-surface.md`.

## 1. Feature summary

One continuous surface where a developer states their project's hard rules, watches the catalog
count drop as each rule fires, orders the survivors by an axis they pick, and ends with a short
ordered list worth testing. It is the whole product promise on one screen, and it is the pressure
test of the v3 API.

## 2. Primary user action

Add or adjust a rule and immediately see what it did: the count drops, the rule announces what it
cut. Everything else serves that loop.

## 3. Design direction

Restrained color on a light-first surface (per DESIGN.md seed). Scene: a developer mid-workday,
browser beside their editor, comparing numbers under mild time pressure. Anchors: Trello for
tactile manipulation, Pipes/n8n for visible composition, Google Flights for the count-drop
pattern, Linear and Stripe for craft of dense data.

**Continuous surface is the commitment; separate form-then-results steps only if iteration
defeats it.** (Mark's explicit call.)

Visual direction probes were skipped: no native image generation in the harness. Probing happens
with real code variants during iteration.

## 4. Scope (task-scoped, does not persist to PRODUCT.md)

High-fi, interactive, in the real Next app. Real models.dev catalog; benchmark scores and
explanations mocked behind the settled v3 signatures so swapping in the real library is trivial
and API awkwardness surfaces now. One core surface; export detail, BYOD upload, and repair
screens are later shapes. Desktop-first with a simplified but real mobile experience. Iterate
until Mark calls it.

## 5. Layout strategy

The count is the hinge of the screen: rules feed into it, results flow out of it. The rules zone
reads as a small pipeline you assemble, each rule a tactile object carrying its own cut count.
The results table gets the most area, sort axis controls directly above it, provenance inline.
The shortlist builds as a visible destination, the output end of the pipeline, not a modal or a
separate page. Iterate two or three arrangements of these zones (rail beside table, pipeline
across the top) before locking one.

## 6. Key states

- **First visit:** full catalog count showing, presets (the six North Star situations) offered as
  fill-ins, an invitation to add the first rule.
- **Active:** rules present, count moving, table live.
- **Zero survivors:** show which rule cut most, so loosening is one click.
- **Unrated:** always present as its own designed bucket, never bottom-of-ranking.
- **Benchmark fetch pending or failed:** the app keeps working; the score column says why it is
  absent, with source and date when present.
- **Reduced motion:** all count and drag feedback becomes state changes.

## 7. Interaction model

Rules add by direct manipulation with a full keyboard path. When a gate fires, the count animates
down and the rule shows "cut N." Column headers re-sort; score is the default sort. Models pin
into the shortlist and reorder by drag (or keyboard) to form the fallback chain. Presets fill
visible, editable values, never hidden ones. Hover reveals nothing essential: source and date are
already visible.

## 8. Content requirements

Fired-gate messages ("removed: input $100/M is above your $50 ceiling"). Unknown labels ("price
unknown," "unrated: no measured score"). Provenance lines ("LMArena, style-controlled,
2026-08-27"). Preset names phrased as situations, not virtues. Zero-survivor guidance copy.
Empty-shortlist nudge.

## 9. Recommended references during build

`interaction-design.md`, `motion-design.md`, `cognitive-load.md`, `product.md`, and `live.md`
once there is something on screen to iterate.

## 10. Open questions for the build

- The exact builder metaphor (chips, lanes, or nodes): settled by iterating real variants.
- Whether the shortlist fills by pinning only or offers "take the top N" as a starting point.
- The final column set for the table (the "re-derive what we care about" note from the grill).
- The small data-viz treatment for rating bands on a light surface.
