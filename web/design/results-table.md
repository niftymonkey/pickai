# The results table

What the table shows at a glance, and what one model's panel holds. Decided 2026-09-03 by looking
at a served mock over the real catalog. Not yet built in `web/`.

## The rule that decides a column

The rail holds the gates and the score holds the ordering, so a column earns its place only if it
is scanned across rows while deciding. Everything else about a model belongs in that model's panel.

Sellers fail that test outright. This is not a place to find a deal: nothing in the six situations
in `design/v3-north-star.md` asks who sells a model cheapest, and rule 9 says pickai is not a
router. Mark, 2026-09-03: "we aren't trying to build an application that shows people the cheapest
location for getting access to a model."

## The five columns

| Column | Why it is at a glance |
| --- | --- |
| **Model** | The name, with the maker under it in dim 12px. The maker costs no column of its own this way, and the name column keeps its width. Sticky left. |
| **Score** | The blended value, in tabular numerals. **No bar.** |
| **Input $/M** | The north star names published rates side by side as one of the jobs, and cost is becoming a blend weight. |
| **Output $/M** | Same. |
| **Context** | The limit people actually run into. Unknown on 1% of rows. |

The table is then 750px wide, against 1,259px for the ten-column shape. **Measured in the app, not
the mock:** at 1440 the results region is 1,066px and nothing scrolls sideways; at 1024 the 300px
rail leaves the region 650px, so about 100px still scrolls, down from 609px before. Closing that
last 100px means narrowing the rail, which belongs to the mobile slice, not to the table. **Released was the sixth column and Mark cut it**
(2026-09-03): the date belongs in the panel, and a narrower table is what makes a mobile rendering
of it possible at all.

**Dropped from the glance, and where each went.** Sellers: gone entirely. Maker: under the name.
Max output, Released and Knowledge cutoff: the panel (cutoff was a hatched "unknown" chip on 42% of rows).
The votes note and the rival-config note: the panel, which also makes every row one line tall.

## The score, and why there is no bar in the row

The old cell drew the confidence interval as a short filled span floating inside a 64px track,
positioned on a scale spanning every rated model. Mark, 2026-09-03: "this weird bar that you render
everywhere is just not obvious to me... I just see a bar that has a weird line part way through it
or at the end of it. Some of those colored bits are wider than others. I just don't understand what
that means."

Two rulings came out of that:

- **A bar that repeats the row order teaches nothing.** The rows are ordered by score, so a position
  bar beside the number says what the reader already sees. The table cell is the number alone.
- **In the panel a bar fills from the left**, at text height, spanning its column: its length is the
  score, so there is nothing to decode. The floating-interval form is rejected and does not come back.

## The model panel

One panel per model, opened from a chevron on the model name. **The chevron points right when the
panel is closed and down when it is open** (Mark, 2026-09-03): a closed disclosure points at what it
will reveal. A down-then-up rotation is rejected. No sub-rows, no repeated listings.
The description leads, then four blocks.

**The description** comes from models.dev and has never been shown before. When a model has none,
the panel says models.dev publishes none rather than leaving a gap.

**How it scored** is why the panel exists. One line per metric the current source published, each
carrying the value, a fill bar, the model's place among the models measured in that category, and
the vote count. A footnote names the bar's two ends in real numbers and says the scale is shared.

- **One scale across all six categories, not one per category.** Per-metric scales made lengths
  look comparable down the column when they were not: Math 1516 drew longer than Coding 1551.
- **Votes are LMArena's unit.** The votes text renders only when the source publishes it, so
  Artificial Analysis shows its own metric names and no votes.
- The rival-config note is a sentence here, not a cramped parenthetical in a table cell.
- An unrated model still gets a full panel; the score block says the source has no measurement and
  that absent data ranks nowhere.

**What it can do**: capability pills in **three states, never two**. Lit means the source said yes,
struck through means it said no, and a dashed outline means it never said either way. A rule cuts on
a stated no and never on silence, which is rule 1 of the north star applied to a boolean.

Measured 2026-09-03 over 1,711 identities (a field counts as stated if any of the model's listings
states it):

| Field | Says yes | Says no | Never says | Verdict |
| --- | --- | --- | --- | --- |
| `attachment` | 54% | 46% | **0%** | Safe as a rule. Add it. |
| `reasoning` | 54% | 46% | **0%** | Already a rule. Safe. |
| `tool_call` | 74% | 26% | **0%** | Already a rule. Safe. |
| `open_weights` | 44% | 56% | **0%** | Already a rule. Safe. |
| `structured_output` | 47% | 18% | **35%** | **Already a rule and it is the unsafe one.** |
| `temperature` | 71% | 15% | 14% | Panel only. Nobody gates a choice on it. |
| `reasoning_options` | 40% | 14% | 46% | Panel only, as detail under Reasoning. |
| `interleaved` | 3% | 12% | 85% | Neither. Too thin to mean anything. |

**Reasoning steering** rides under the pills as a sentence built from the published option shape,
never from a per-model string: "Steered by effort levels low, medium, high." models.dev publishes
`effort` (with its own value list), `toggle`, and `budget_tokens`, and 74% of the models that claim
reasoning also publish how it is steered.

Then what the model takes in and gives back.

**Limits and prices**: context, max output, input, output, cache read, cache write.

**Identity and dates**: maker, family, model id, released, knowledge cutoff, catalog updated, and
**Providers** (a bare count, no list). Mark's naming call 2026-09-03: "sold by" is wrong, "providers"
is better. The count survives the seller cull because a model with one provider is a different bet
from one with forty; it is an availability signal, not a price one.

**One alignment rule in every block**: label left, value right. The earlier mix of left-aligned prose
values and right-aligned numbers read ragged, and Mark caught it in the identity block.
