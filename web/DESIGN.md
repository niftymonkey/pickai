---
name: pickai
description: Filter, score, and shortlist AI models with the reasoning attached
colors:
  bench: "oklch(94% 0.01 250)"
  bench-2: "oklch(91% 0.014 250)"
  card: "oklch(97% 0.005 250)"
  ink: "oklch(22% 0.03 265)"
  ink-2: "oklch(42% 0.04 262)"
  ink-3: "oklch(57% 0.035 260)"
  line: "oklch(86% 0.02 255)"
  line-2: "oklch(78% 0.028 255)"
  accent: "oklch(52% 0.2 262)"
  accent-deep: "oklch(44% 0.19 262)"
  accent-soft: "oklch(92.5% 0.05 258)"
  accent-ink: "oklch(42% 0.17 262)"
  hatch-line: "oklch(90.5% 0.018 255)"
  rail-bg: "oklch(27% 0.07 265)"
  rail-card: "oklch(32% 0.075 265)"
  rail-ink: "oklch(96% 0.01 250)"
  rail-ink-2: "oklch(80% 0.035 255)"
  rail-ink-3: "oklch(66% 0.05 260)"
  rail-line: "oklch(40% 0.075 265)"
  rail-hover: "oklch(37% 0.075 265)"
typography:
  display:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "2.25rem"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.025em"
    fontFeature: "tabular-nums"
  headline:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
  body:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    letterSpacing: "0.05em"
  data:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "0.75rem"
    fontWeight: 400
    fontFeature: "tabular-nums"
rounded:
  sm: "4px"
  md: "6px"
  lg: "8px"
  xl: "12px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "6px"
  md: "12px"
  lg: "16px"
  xl: "24px"
components:
  chip-rule-active:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.accent-ink}"
    rounded: "{rounded.md}"
    padding: "4px 8px"
  chip-rule-rest:
    backgroundColor: "transparent"
    textColor: "{colors.rail-ink}"
    rounded: "{rounded.md}"
    padding: "4px 8px"
  chip-unknown:
    textColor: "{colors.ink-2}"
    rounded: "{rounded.sm}"
    padding: "2px 6px"
  segment-active:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.accent-ink}"
    rounded: "{rounded.md}"
    padding: "4px 32px 4px 10px"
  segment-rest:
    backgroundColor: "transparent"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.md}"
    padding: "4px 32px 4px 10px"
  stepper:
    textColor: "{colors.accent-ink}"
    rounded: "{rounded.sm}"
    size: "24px"
  stepper-hover:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.card}"
  button-secondary:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.md}"
    padding: "4px 10px"
  input-search:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "6px 12px"
  input-rail:
    backgroundColor: "{colors.rail-hover}"
    textColor: "{colors.rail-ink}"
    rounded: "{rounded.md}"
    padding: "4px 8px"
  rule-card:
    backgroundColor: "{colors.rail-card}"
    textColor: "{colors.rail-ink}"
    rounded: "{rounded.lg}"
    padding: "8px 12px"
  surface-table:
    backgroundColor: "{colors.card}"
    rounded: "{rounded.lg}"
  tooltip:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.lg}"
    padding: "8px 10px"
    width: "288px"
---

# Design System: pickai

## 1. Overview

**Creative North Star: "The Instrument Bench"**

A calm workbench where a developer assembles a decision. The bench itself is quiet: cool
blueprint-tinted paper, generous space, nothing shouting. The instruments on it are exact:
aligned monospace numbers, a source and a measurement date beside every figure, unknowns
labeled as unknowns rather than filled in. Delight lives in the hands, not the chrome. The
survivor count tweens as gates fire, a rule row flashes when its state changes, and the readouts
stay as sober as a Stripe dashboard.

The page is two surfaces and nothing else: a dark rail on the left headed Model requirements,
carrying its rows in two named groups plus a More disclosure, and a light bench on the right
headed Score, carrying the search, the score source beside that heading, the blend, the census
receipt, and one long virtualized table. There is no
navigation, no dashboard, no modal. Every control applies instantly; nothing waits for a submit.

Two committed themes share every token through `light-dark()`: **Blueprint** (light: cool
drafting paper, structural cobalt) and **Night** (dark: neutral graphite, cool blue). The OS
picks by default and `html[data-theme]` overrides, so a switcher is a hook away. This system
explicitly rejects the AI-tool SaaS template (dark purple gradients, glassmorphism, hero metrics,
sparkle icons), leaderboard trophy energy, enterprise BI walls of charts, and anything resembling
a chatbot.

**Key Characteristics:**
- Quiet shell, exact data, instant application of every rule
- One cobalt accent, used sparingly and meaningfully
- Numbers in monospace with tabular figures; they align or they are wrong
- Unknown is a designed state (hatched, labeled), distinct from empty and from zero
- The rules rail is its own dark surface in both themes, and it paints no count: the survivor
  number lives with the results, above the table
- Provenance is visible by default; only the catalog receipt hides behind an info hover
- Every visual decision lands as a token, so recolor and theming are swaps, not rewrites

## 2. Colors

Restrained strategy: cool tinted neutrals plus one structural cobalt accent, on a dark rules
rail that anchors the page. Frontmatter values are the Blueprint (light) theme; every token has
a Night pair in `app/globals.css` via `light-dark()`, cataloged in `.impeccable/design.json`.

### Primary
- **Structural Cobalt** (`accent`, oklch(52% 0.2 262)): the instrument needle. The score band
  fill, an active facet chip's border, the stepper's hover fill, the focus ring, and the hovered
  info trigger. Its rarity is the point. `accent-deep` is the deep hover step; `accent-soft` and
  `accent-ink` are its quiet fill-and-text pair for every selected state.

### Neutral
- **Drafting Paper** (`bench`, oklch(94% 0.01 250)): the page. `bench-2` is the shade behind the
  score band's track and a hovered segment.
- **Sheet White** (`card`, oklch(97% 0.005 250)): the table surface, the search box, tooltips,
  the Retry button.
- **Iron Ink** (`ink`, oklch(22% 0.03 265)): primary text, with `ink-2` and `ink-3` stepping
  back for secondary readings and placeholders.
- **Rule Lines** (`line`, `line-2`): hairline borders and dividers only, never fills. `line-2`
  carries the heavier marks: the table's header underline and the toolbar's 2px separator.
- **Hatch** (`hatch-line`): the diagonal stripe fill that marks an unrated or unknown value.

### Rail (its own surface)
- **Blueprint Slate** (`rail-bg`, oklch(27% 0.07 265)) with `rail-card`, the `rail-ink` steps,
  `rail-line`, and `rail-hover`: the rules rail and everything on it. Dark in both themes.

### Named Rules
**The Token Door Rule.** Every color exists only as a CSS custom property. Recoloring or adding
a theme is a token swap, never a screen edit. A hardcoded color in a component is prohibited.

**The Quiet Bench Rule.** The accent appears on at most one class of element per screen. If two
things compete for the accent, one of them does not get it.

**The Unrated Hue Rule.** Unknown renders as the hatched treatment plus a lowercase label
("unrated", "price unknown"), never gray-as-afterthought and never red-as-error.

**The Dark Rail Rule.** The rules rail is a visibly different, darker surface in both themes.
The survivor count lives on it, beside the rules that cause it.

**The Distinct Hover Rule.** A hover treatment must differ from the resting background of every
surface the control can sit on. A soft accent wash on a control that already sits on
`accent-soft` is invisible, which is why the steppers hover with a full accent fill.

## 3. Typography

**Display Font:** Geist Mono (ui-monospace fallback)
**Body Font:** Geist (system-ui fallback)
**Label/Mono Font:** Geist Mono with tabular figures, via the `.tnum` class

**Character:** a calm technical sans carries labels, controls, and prose; a true monospace
carries everything measured. It reads like good tooling, not like a magazine.

### Hierarchy
- **Display** (600, 2.25rem, mono, tabular): the survivor count on the rail. Nowhere else.
- **Headline** (600, 1.5rem, -0.025em): the wordmark only.
- **Title** (500, 0.875rem): model names in table rows.
- **Body** (400, 0.875rem, 1.5): explanations, table cells, and control text; prose capped at
  65-75ch.
- **Label** (500, 0.75rem, 0.05em tracking, uppercase): section headers ("SCORE SOURCE",
  "SCORE BLEND", "YOUR RULES") and table column headers.
- **Data** (400, 0.75-0.875rem, mono, tabular-nums): every rate, score, date, count, and ID.

### Named Rules
**The Measured Mono Rule.** Rates, scores, dates, model ids, and counts are always tabular
figures (`.tnum`), monospace wherever they sit in a column. If columns of numbers do not align,
the type is wrong.

**The Reserved Slot Rule.** A number that can appear and disappear (a cut count, a weight, a
status note) reserves its space at rest. Text that pushes its neighbours sideways when it lands
makes a control move under the pointer, which is a bug.

## 4. Elevation

Flat, with no shadow vocabulary at all. The page is layered by surface color alone: `bench`
behind, `card` for the table and floating tips, `rail-bg` for the rail. Depth reads as tone, and
the only thing that stacks is the tooltip, which wins its z-order (z-40) over the table's sticky
header rather than lifting off the page with a shadow.

Motion energy is Responsive. Color and border transitions run 150ms; the count tweens 360ms on
an ease-out-quart curve; a rule row that changes state flashes `rule-fire` (700ms, accent-soft
fading to transparent); a disclosure caret rotates 150ms. Under `prefers-reduced-motion` every
animation and transition collapses to 0.01ms and nothing loses function.

### Named Rules
**The Flat-By-Default Rule.** Surfaces are flat at rest and stay flat on hover. A shadow on a
row, card, chip, or button is a bug. If an element needs to read as above another, it takes a
z-index and a border, not a shadow.

**The No-Transform-Under-A-Tip Rule.** An element that hosts a tooltip is never centered with a
transform. A transform starts a stacking context and the tip's z-index then loses to whatever is
above its parent. Center with `absolute inset-y-0 flex items-center` instead.

## 5. Components

### Buttons
- **Shape:** gently rounded (6px), or 8px for a full-width rail row.
- **Rail row:** the whole row is the button. Transparent at rest on `rail-card`, filling
  `rail-hover` on hover; a right-hand caret rotates 90 degrees when open.
- **Secondary (Retry):** `card` fill, 1px `line` border, `ink-2` text; hover swaps the border to
  accent.
- **Focus:** 2px accent outline at 2px offset, set globally on `:focus-visible`.
- **Cursor:** the hand, set once in a base layer for `button`, `select`, `summary`, and
  checkboxes. Tailwind v4 ships buttons with the plain arrow; per-component `cursor-pointer` is
  prohibited.
- **Target size:** every control's box is at least 24px in both axes (WCAG 2.5.8). A small glyph
  earns its box with an invisible `::before` inset, not by growing.

### Chips
- **Facet chips (rail):** 6px radius, 1px border. Active = accent border, `accent-soft` fill,
  `accent-ink` text, and a 1px accent ring on hover (an active chip is still a control, it turns
  off). Rest = `rail-line` border, `rail-ink` text, accent border on hover.
- **Blend chips (bench):** the same active and rest treatment, carrying a metric label, a
  weight, and two 24px steppers. Hover on a stepper is a full accent fill with `card` text.
- **Unknown chip (signature):** the `.hatch` diagonal-stripe fill, 4px radius, `ink-2` label.

### Cards / Containers
- **Rule cards:** `rail-card` fill on the rail, 8px radius, 1px `rail-line` border, cut counts in
  `rail-ink-2` at 80% opacity.
- **Table surface:** `card` fill, 8px radius, 1px `line` border, its own scroll region with the
  quiet-scrollbar treatment (the scrollbar is transparent until the region scrolls).
- **No nested cards, ever.**

### Inputs / Fields
- **Bench search:** `card` fill, 1px `line` border, 8px radius, `ink-3` placeholder; hover
  brightens the border to `line-2`.
- **Rail inputs and selects:** `rail-hover` fill, 1px `rail-line` border, 6px radius; hover
  brightens the border to `rail-ink-3`.
- **Checkboxes:** native, tinted with the accent, inside a full-width label that is the real
  24px target.
- **Committing a value:** a numeric fence commits on blur and on Enter; the input is never keyed
  on its applied value, because the remount drops focus on every commit.

### Navigation
- **None.** One continuous surface, a sticky rail on wide windows, a stacked column on narrow
  ones. The mobile bottom bar and drawer are not built yet.

### The Segmented Source Switch (signature)
Two cells inside one 6px-radius bordered group, each cell a full-width button with its own info
hover floating in its right padding as a sibling. The group cannot clip its corners, because an
option's tip is absolutely positioned inside it; the end segments round themselves instead.
Active = `accent-soft` fill and `accent-ink` text; rest = `ink-2` text with a `bench-2` hover.

### The Info Hover (signature)
One tooltip pattern everywhere: a 15px circled "i" in mono, `line` border, `ink-3` glyph, whose
invisible `::before` grows the target to 27px. Hover, focus, and click all open it; Escape
closes it. The tip is an 8px-radius `card` panel, 288px wide, hanging from the trigger's left or
right edge, with its gap as padding rather than margin so the pointer can cross into it.

### The Count Readout (signature)
The display-size mono number on the rail that tweens as rules fire. It is the pipeline made
visible and it never appears detached from the rules that cause it. The tweening number is
hidden from the accessibility tree; a quiet live region announces only the settled value.

### The Score Band (signature)
A 64px by 6px `bench-2` track with an accent fill marking where a model's score sits across all
rated survivors. It renders beside the number, never instead of it, and it is decorative to the
accessibility tree.

## 6. Do's and Don'ts

### Do:
- **Do** put the source name and measurement date beside every number, in the UI itself.
- **Do** render an absent value as the hatched unknown chip with its own words.
- **Do** reserve the space a number will occupy, so nothing shifts when it lands.
- **Do** give every pointer interaction a keyboard path, and announce state changes in a live
  region.
- **Do** route every color through a token; `light-dark()` carries both themes.
- **Do** keep each control's box at 24px or larger, with a hover state and the hand cursor.

### Don't:
- **Don't** use the AI-tool SaaS template: dark purple gradients, glassmorphism, hero metrics,
  sparkle icons.
- **Don't** ship leaderboard trophy energy or any rank-1 visual emphasis.
- **Don't** build enterprise BI walls of charts.
- **Don't** add a chatbot, a prose input box, or conversational framing anywhere.
- **Don't** use pure #000 or #fff, side-stripe borders, gradient text, or em dashes in copy.
- **Don't** put the accent on two competing element classes on one screen (Quiet Bench Rule).
- **Don't** render a measured value without tabular figures (Measured Mono Rule).
- **Don't** hover a control with a wash that matches any surface it can rest on (Distinct Hover
  Rule).
- **Don't** center a tooltip host with a transform (No-Transform-Under-A-Tip Rule).
- **Don't** hide provenance behind a hover beyond the one catalog receipt in the header.
