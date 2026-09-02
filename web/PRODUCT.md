# Product

The shipping web app (`web/`). Paths named below are relative to the repository root.

## Register

product

## Users

Developers and technical decision-makers choosing an AI model, in one of six situations (from
`design/v3-north-star.md`, deliberately unranked): picking a model for something they are building,
prototyping without knowing their options, choosing a model for a coding harness, stepping down to
something cheaper, being pushed off a retiring or degraded model, or re-checking a choice made
months ago. What they share: they want a consistent, measured way to decide instead of a guess.
They usually arrive knowing two or three model names out of a catalog of roughly two thousand
model identities across seven thousand listings.

This audience distrusts hype. Refusing to answer what we cannot answer is the most credible thing
on the page.

## Product Purpose

The web app for the pickai library. The user states their project's hard rules and what matters
this week; the app hands back a short ordered list of models worth testing, with a fallback chain
and the reasoning attached. Every gate names itself when it fires. Every number carries its source
and date. The decision exports as pickai code so it can be re-run when the catalog moves.

Success looks like: someone completes the flow, tests models they had not heard of, and comes back
next quarter to re-run the decision.

The canonical pitch lives in `design/v3-decisions.md` 9.15. The app is fully deterministic: no LLM
anywhere in it (decision 9.3).

## Brand Personality

Candid, exact, calm.

- **Candid:** the app says what it does not know, out loud. Absent data is its own visible state.
- **Exact:** provenance beside every number, real units, no vibes.
- **Calm:** the user is making a decision, sometimes under pressure. No urgency tricks, no hype.

Delight lives in the interactions, never in the data. Building up what you care about should feel
tactile and even whimsical; reading the results should feel like reading an instrument.

## References

Interaction references (the way it works, not necessarily the way it looks):

- **Trello:** tactile direct manipulation, small moments of whimsy, dragging feels like touching
  the thing.
- **Yahoo Pipes / n8n:** composition you can see. "This connects to that" as a picture you build.
  pickai's flow is literally a pipeline (catalog, gates, benchmark join, ordering, shortlist,
  export), so the builder metaphor matches the real data flow.
- **Flight search (Kayak / Google Flights pattern):** filters visibly shrink a big set, the count
  drops as each rule applies, survivors re-sort by the axis you pick. Interaction pattern only;
  their visual clutter is an anti-reference.

Craft references (the exactness-and-calm side):

- **Linear:** dense information that never feels loud.
- **Stripe dashboard:** numbers people bet money on, every figure legible and unambiguous.

## Anti-references

- **The AI-tool SaaS template:** dark purple gradients, glassmorphism, hero metrics, sparkle
  icons. The instant "AI made this" look.
- **Leaderboard hype sites:** giant rank-1 trophy energy. The North Star forbids rank-1 answers;
  the design must not smell like one.
- **Enterprise BI density** (Tableau, Grafana-as-dashboard): walls of charts that feel like
  homework.
- **A chatbot.** No prose input box, no conversational framing, ever (decision 9.3).

## Design Principles

1. **Unknown is a state, not a zero.** Absent data renders as its own visible state, distinct from
   both empty and zero. It appears on every screen and is central to the product thesis.
2. **Every number shows its receipts.** Source name and measurement date sit beside every figure,
   in the UI itself, not in a footnote. Uncertainty renders as bands and tiers, never as exact
   positions.
3. **The user picks the axis.** The app offers the sort and never chooses for them. Presets fill
   in visible, editable values; they never decide invisibly. Explanations say "removed by this
   rule" and "won on this metric" so the user can check the app's work.
4. **The pipeline is visible.** Rules, joins, and ordering compose like a picture the user builds
   and can reason about. Watching the count drop as gates fire is a core moment, not a side
   effect.
5. **Delight in the hands, honesty in the numbers.** Whimsy belongs to interactions (dragging,
   connecting, building). Data display stays instrument-grade. The two never trade places.

Known hard design problems these principles must answer (from decision 9.17): rendering
uncertainty, absent data as a state, explaining a computed ranking with provenance, and the
partial-match repair screen for BYOD uploads where roughly half of supplied rows may not join.

## Accessibility & Inclusion

- **WCAG 2.2 AA** as the floor.
- **Full keyboard paths for everything draggable** (WCAG 2.5.7). The delightful way and the
  keyboard way both work.
- **Reduced motion honored:** whimsy calms down under `prefers-reduced-motion` without losing
  function.
- **Never color alone:** bands, tiers, and comparisons always carry a label or shape, not just a
  hue.
