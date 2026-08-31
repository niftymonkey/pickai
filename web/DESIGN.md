---
name: pickai
description: Filter, compare, and shortlist AI models with the reasoning attached
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
    fontFamily: "Geist Mono, monospace"
    fontSize: "2.25rem"
    fontWeight: 600
    lineHeight: 1.1
    fontFeature: "tabular-nums"
  headline:
    fontFamily: "Geist Sans, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Geist Sans, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
  body:
    fontFamily: "Geist Sans, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Geist Sans, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    letterSpacing: "0.05em"
  data:
    fontFamily: "Geist Mono, monospace"
    fontSize: "0.875rem"
    fontWeight: 400
    fontFeature: "tabular-nums"
rounded:
  sm: "4px"
  md: "6px"
  lg: "8px"
  xl: "12px"
  2xl: "16px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.card}"
    rounded: "{rounded.md}"
    padding: "4px 10px"
  button-primary-hover:
    backgroundColor: "{colors.accent-deep}"
  button-secondary:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.md}"
    padding: "4px 10px"
  chip-metric-active:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.accent-ink}"
    rounded: "{rounded.lg}"
    padding: "2px 4px"
  card-result:
    backgroundColor: "{colors.card}"
    rounded: "{rounded.xl}"
    padding: "10px 12px"
  rule-card:
    backgroundColor: "{colors.rail-card}"
    textColor: "{colors.rail-ink}"
    rounded: "{rounded.lg}"
    padding: "8px 12px"
  input-search:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "6px 12px"
---

# Design System: pickai

## 1. Overview

**Creative North Star: "The Instrument Bench"**

A calm workbench where a developer assembles a decision. The bench itself is quiet: cool
blueprint-tinted paper, generous space, nothing shouting. The instruments on it are exact:
aligned monospace numbers, sources and dates beside every figure, unknowns labeled as unknowns.
The delight lives in the hands, not the chrome: preset rules fly down into the rules panel as
ghost chips, the survivor count tweens as gates fire, and the readouts stay as sober as a
Stripe dashboard.

Two committed themes share every token through `light-dark()`: **Blueprint** (light: cool
drafting paper, structural cobalt) and **Night** (dark: neutral graphite, cool blue). The OS
picks by default; `html[data-theme]` overrides. This system explicitly rejects the AI-tool SaaS
template (dark purple gradients, glassmorphism, hero metrics, sparkle icons), leaderboard trophy
energy, enterprise BI walls of charts, and anything resembling a chatbot.

**Key Characteristics:**
- Quiet shell, exact data, tactile interactions
- One cobalt accent, used sparingly and meaningfully
- Numbers in monospace with tabular figures; they align or they are wrong
- Unknown is a designed state (hatched), visually distinct from empty and from zero
- The rules panel is its own dark surface in both themes; the live count sits on it
- Every visual decision lands as a token, so recolor and theming are swaps, not rewrites

## 2. Colors

Restrained strategy: cool tinted neutrals plus one structural cobalt accent, on a dark rules
rail that anchors the page. Frontmatter values are the Blueprint (light) theme; every token has
a Night pair in `globals.css` via `light-dark()`, cataloged in `.impeccable/design.json`.

### Primary
- **Structural Cobalt** (`accent`, oklch(52% 0.2 262)): the instrument needle. Primary actions,
  the active sort, the active metric chip, a rule that just fired, ghost-chip flights. Its rarity
  is the point. `accent-deep` is its hover; `accent-soft` and `accent-ink` are its quiet
  fill-and-text pair for selected states.

### Neutral
- **Drafting Paper** (`bench`, oklch(94% 0.01 250)): the page. `bench-2` is the shade for seller
  sub-rows and hover.
- **Sheet White** (`card`, oklch(97% 0.005 250)): result rows, cards, inputs, chips at rest.
- **Iron Ink** (`ink`, oklch(22% 0.03 265)): primary text, with `ink-2` and `ink-3` stepping
  back for secondary and tertiary.
- **Rule Lines** (`line`, `line-2`): hairline borders and dividers only, never fills.
- **Hatch** (`hatch-line`): the diagonal stripe fill that marks unknown values.

### Rail (its own surface)
- **Blueprint Slate** (`rail-bg`, oklch(27% 0.07 265)) with `rail-card`, `rail-ink` steps,
  `rail-line`, `rail-hover`: the rules panel, the mobile bottom bar, and the drawer. Dark in
  both themes.

### Named Rules
**The Token Door Rule.** Every color exists only as a CSS custom property. Recoloring or adding
a theme is a token swap, never a screen edit. A hardcoded color in a component is prohibited.

**The Quiet Bench Rule.** The accent appears on at most one class of element per screen. If two
things compete for the accent, one of them does not get it.

**The Unrated Hue Rule.** Unknown renders as the hatched treatment with a label ("unrated",
"price unknown"), never gray-as-afterthought and never red-as-error.

**The Dark Rail Rule.** The rules panel is a visibly different, darker surface in both themes.
The survivor count lives on it, beside the rules that cause it.

## 3. Typography

**Display Font:** Geist Mono (monospace fallback)
**Body Font:** Geist Sans (system-ui fallback)
**Label/Mono Font:** Geist Mono with tabular figures

**Character:** a calm technical sans carries labels, controls, and prose; a true monospace
carries everything measured. It reads like good tooling, not like a magazine.

### Hierarchy
- **Display** (600, 2.25rem, mono, tabular): the survivor count readout on the rail. Nowhere else.
- **Headline** (700, 1.25-1.5rem, tight tracking): the product name only.
- **Title** (500, 0.875rem): model names in rows and cards.
- **Body** (400, 0.875rem, 1.5): explanations and controls; line length capped at 65-75ch.
- **Label** (500, 0.75rem, 0.05em tracking, uppercase): section headers ("YOUR RULES",
  "SCORE BLEND"), table column headers.
- **Data** (400, 0.75-0.875rem, mono, tabular-nums): every rate, score, date, count, and ID.

### Named Rules
**The Measured Mono Rule.** Rates, scores, dates, model IDs, and counts are always monospace
with tabular figures (`.tnum`). If columns of numbers do not align, the type is wrong.

## 4. Elevation

Flat by default; the page is layered by surface color (bench, card, rail), not by shadows. Only
two floating elements cast: the theme switcher pill (`shadow-sm`) and the mobile rules drawer
(`shadow-lg`). Motion energy is Responsive: the count tweens over 360ms, new rules flash the
`rule-fire` highlight (700ms, ease-out-quart), preset rules fly as ghost chips (520ms,
staggered 90ms). Under `prefers-reduced-motion` every animation collapses to an instant state
change and nothing loses function.

### Named Rules
**The Flat-By-Default Rule.** Surfaces are flat at rest. Depth appears only on the two floating
elements; a shadow on a table row or card is a bug.

## 5. Components

### Buttons
- **Shape:** gently rounded (6px)
- **Primary:** cobalt fill, sheet-white text, small (4px 10px); hover deepens to `accent-deep`
- **Secondary:** card fill with 1px `line` border, `ink-2` text; hover swaps border to accent
  and text to `accent-ink`
- **Focus:** 2px accent outline, 2px offset (global `:focus-visible`)

### Chips
- **Metric chips (score blend):** rounded-lg bordered chips with minus/plus steppers; active =
  `accent-soft` fill + `accent-ink` text + accent border, inactive = card fill + `ink-3`
- **Situation chips:** card-filled bordered buttons (6-8px radius); hover fills `accent-soft`
- **Ghost chips (flight):** fixed-position `accent-soft` chips that animate from a tapped
  preset to the rules home, then fade

### Cards / Containers
- **Result rows and cards:** `card` fill, 12px radius on cards, hairline `line` borders;
  expanded card gets an accent border
- **Rule cards:** `rail-card` fill on the rail, 8px radius, cut counts in `rail-ink-2`
- **No nested cards, ever**

### Inputs / Fields
- **Search and text inputs:** card fill, 1px `line` border, 8px radius, `ink-3` placeholder
- **Rail inputs:** `rail-hover` fill with `rail-line` border

### Navigation
- **None.** One continuous surface. The mobile bottom bar (rail surface) holds the live count
  and the Rules button that opens the drawer; the theme switcher pill floats bottom-right.

### The Unknown Chip (signature)
The `.hatch` diagonal-stripe fill plus a lowercase label ("unrated", "unknown", "price
unknown"). It appears in table cells, cards, and the unrated bucket divider. It is the product
thesis rendered: absent data is a designed state.

### The Count Readout (signature)
The display-size mono number on the rail (and mobile bar) that tweens as rules fire. It is the
pipeline made visible; it never appears detached from the rules that cause it.

## 6. Do's and Don'ts

### Do:
- **Do** put source name and measurement date beside every number, in the UI itself.
- **Do** render uncertainty as bands (low-high) and label partial blends ("2/3 metrics").
- **Do** give every pointer interaction a keyboard path (row expand keeps its button).
- **Do** design the unknown state deliberately on every screen that shows data.
- **Do** route every color through a token; `light-dark()` carries both themes.

### Don't:
- **Don't** use the AI-tool SaaS template: dark purple gradients, glassmorphism, hero metrics,
  sparkle icons.
- **Don't** ship leaderboard trophy energy or any rank-1 visual emphasis.
- **Don't** build enterprise BI walls of charts.
- **Don't** add a chatbot, a prose input box, or conversational framing anywhere.
- **Don't** use pure #000 or #fff, side-stripe borders, gradient text, or em dashes in copy.
- **Don't** put the accent on two competing element classes on one screen (Quiet Bench Rule).
- **Don't** render a measured value in the sans face (Measured Mono Rule).
