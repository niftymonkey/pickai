<!-- SEED: re-run /impeccable document once there's code to capture the actual tokens and components. -->

---
name: pickai
description: Filter, compare, and shortlist AI models with the reasoning attached
---

# Design System: pickai

## 1. Overview

**Creative North Star: "The Instrument Bench"**

A calm workbench where a developer assembles a decision. The bench itself is quiet: tinted
neutrals, generous space, nothing shouting. The instruments on it are exact: aligned numbers,
sources and dates beside every figure, unknowns labeled as unknowns. The delight lives in the
hands, not the chrome: dragging, connecting, and watching the candidate count drop feel tactile
and responsive, like Trello's cards or a Pipes/n8n graph, while the readouts stay as sober as a
Stripe dashboard.

This system explicitly rejects the AI-tool SaaS template (dark purple gradients, glassmorphism,
hero metrics, sparkle icons), leaderboard trophy energy, enterprise BI walls of charts, and
anything resembling a chatbot.

**Key Characteristics:**
- Quiet shell, exact data, tactile interactions
- One warm accent, used sparingly and meaningfully
- Numbers in monospace with tabular figures; they align or they are wrong
- Unknown is a designed state, visually distinct from empty and from zero
- Every visual decision lands as a token, so recolor and theming are swaps, not rewrites

## 2. Colors

Restrained strategy: tinted neutrals plus one warm amber-orange accent, held to a small share of
any screen.

### Primary
- **Warm amber-orange accent** [to be resolved during implementation]: the instrument needle. It
  marks the thing that matters right now: the primary action, a gate that just fired, a highlight
  in the builder. Its rarity is the point.

### Neutral
- **Neutrals tinted toward the accent hue** [to be resolved during implementation]: backgrounds,
  text, borders, dividers. Never pure #000 or #fff.

### Named Rules
**The Token Door Rule.** Every color exists only as a token (CSS custom property in the Tailwind
theme). Recoloring the app or adding light/dark modes must be a token swap, never a screen edit.
This was an explicit requirement, not a preference.

**The Quiet Bench Rule.** The accent appears on at most one class of element per screen. If two
things compete for the accent, one of them does not get it.

**The Unrated Hue Rule.** The "unknown / unrated" state gets its own deliberate visual treatment,
designed on purpose, and it is never gray-as-afterthought and never red-as-error.

## 3. Typography

**Display Font:** [font pairing to be chosen at implementation]
**Body Font:** single technical sans [to be chosen at implementation]
**Label/Mono Font:** true monospace with tabular figures [to be chosen at implementation]

**Character:** a calm technical sans carries labels, controls, and prose; a real monospace carries
everything measured. The pairing should read like good tooling, not like a magazine.

### Hierarchy
[to be resolved during implementation; body line length capped at 65-75ch, scale steps at a ratio
of at least 1.25]

### Named Rules
**The Measured Mono Rule.** Rates, scores, dates, model IDs, counts, and exported code are always
monospace with tabular figures. If columns of numbers do not align, the type is wrong.

## 4. Elevation

Flat by default. Depth appears only as a response to interaction: a card lifting while dragged, a
focused element coming forward. Motion energy is Responsive (feedback and transitions, no
choreography), and under `prefers-reduced-motion` it degrades to state changes only, losing no
function.

## 5. Components

[omitted: no components exist yet. First candidates when they do: the gate/rule chip, the results
table row, the provenance label, the unrated badge, the builder node.]

## 6. Do's and Don'ts

### Do:
- **Do** put source name and measurement date beside every number, in the UI itself.
- **Do** render uncertainty as bands and tiers, never as exact positions.
- **Do** give every draggable interaction a full keyboard path (WCAG 2.5.7).
- **Do** design the unknown/unrated state deliberately on every screen that shows data.
- **Do** keep whimsy in the interactions and instrument-grade sobriety in the data display.

### Don't:
- **Don't** use the AI-tool SaaS template: dark purple gradients, glassmorphism, hero metrics,
  sparkle icons.
- **Don't** ship leaderboard trophy energy or any rank-1 visual emphasis.
- **Don't** build enterprise BI walls of charts.
- **Don't** add a chatbot, a prose input box, or conversational framing anywhere.
- **Don't** use pure #000 or #fff, side-stripe borders, or gradient text.
- **Don't** hardcode a color in a component; it goes through a token or it does not go in.
