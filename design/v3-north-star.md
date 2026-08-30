# pickai North Star

What this is for, and what to weigh when a decision is hard.

This is not a plan and not a spec. Read it when a design choice, an API change, a new feature, or a
bug fix could go either way. If a decision does not obviously follow from what is written here,
escalate it rather than guess.

Written 2026-08-30, after six research sweeps and four follow-up investigations into benchmark
sources. The evidence lives in `design/research/`. The history lives in `continue-v3-redesign.md`.

---

## What this is

There are thousands of models and most people try the one they have heard of. Tell pickai what your
project needs and which of those needs matter most, and it hands back a short list worth trying,
with the reasoning attached so you can check it again when things change.

## When people reach for it

Six situations. No ranking among them, and no single one explains the tool.

**Picking a model for something I am building.** The app calls an LLM and the choice has to fit what
the app does: the capabilities it depends on, the limits it runs into, what it costs to run.

**Prototyping, where I do not yet know my options.** Trying to find out whether the thing is
possible at all. Cost is irrelevant at this stage. What matters is a handful of plausible candidates
to go try, chosen from more than the two names everybody already knows.

**Choosing which model to run in a coding harness.** Opus 5 or Fable? Something smaller for the
routine parts? Terra instead of Sol for this class of work? Named models, weighed against work
already underway. Asked constantly and usually answered with vibes.

**Stepping down to something cheaper.** It works and it costs too much. The fear is a quality drop
nobody notices for weeks.

**Being pushed off a model.** It is retiring, or it degraded, or the provider changed something.
Nobody chose this, and the work is proving a replacement is safe.

**Re-checking a choice made months ago.** The catalog moved. The reasoning that produced the
original answer should still be runnable.

### What they share

Someone wants a consistent, measured way to decide, instead of a guess.

What varies is which axis binds. Sometimes cost. Often whether the model can do the job at all.
Sometimes a rule nobody chose. The tool must not assume, which is why rule 4 exists.

## What it is for

To produce a short list that is worth trying, and defensible when someone asks.

Both halves matter, and they are not the same job.

**Worth trying.** The output is a set of candidates for an experiment, not a verdict. Getting
someone unstuck and testing is the point.

**Defensible.** Every number can be traced: where it came from, when it was measured, and what it
does not cover. Three to seven, ordered, with a fallback chain. Never one answer. The final decision
belongs to the user's own evaluation, and a tool that pretends otherwise is lying.

## How it helps

- It removes what they are not allowed to use, and names the rule that removed it.
- It orders what remains by the axis they choose, because we do not know which need binds their
  project this week.
- It shows what each option costs: the published rates, side by side, compared against the rest of
  the list.
- It says plainly which questions it cannot answer.
- It hands back the decision as code, so they can re-run it when the catalog moves.

---

## What to weigh when a decision is hard

Ten tests. When a choice is genuinely close, these decide it.

### 1. Unknown is a value, never a zero

Missing data must never become a number. A model with no price is not free. A model with no
benchmark score is not bad. Anything that silently turns absence into a ranking input is a bug, no
matter how good the output looks.

*This is the deepest failure in v2 and the most likely one to reappear.*

### 2. Every number carries its source and its date

Not in a footnote. Beside the number, in the API and in any UI. A figure without provenance is not
usable in a decision someone has to defend.

### 3. Eligibility is absolute. Ranking is a preference.

Hard rules (region, retention, license, context fits, modality required) are gates. They eliminate,
and they announce themselves when they fire. Everything after that is ordering, and ordering is the
user's call. Never blend a gate into a weighted score.

### 4. The user picks the axis. We do not pick for them.

The research is unambiguous that the binding constraint varies per project and per week. Offering
"sort by cheapest, most capable, biggest context, newest" is honest. Choosing on their behalf, and
especially bundling that choice into a profile named after a virtue, is not.

### 5. We never claim a model is good

We report what someone else measured, attributed. Only the task can answer whether a model is good
enough for that task. Say so out loud, repeatedly, in the product. Refusing a question we cannot
answer is a feature, and with this audience it is the most credible thing on the page.

### 6. The answer expires

Models ship weekly and prices move. Every design should assume the user will need to re-run this
decision in three months. That is why the code export exists, and it is why the web app is not the
whole product.

### 7. Ship formats, not other people's data

pickai agrees to no third-party terms. It publishes a schema and reads what the user supplies, or
reads a source with an unambiguous open license. Never vendor someone's numbers, never name a
source in an API when that source's terms forbid the use. Licensing safety by construction, not by
interpretation.

### 8. Bring-your-own-data is a first-class path, not a fallback

The most important input in the library is the one the user supplies. If BYOD is harder than the
built-in path, the design is wrong.

### 9. Static catalog, zero dependencies, not a router

pickai does deliberate up-front selection. It does not consume live telemetry, does not resolve
per-request, and does not become a gateway. Routers that tried this deprecated them. A feature that
needs a live feed or per-request logic belongs somewhere else.

### 10. Say what we do not cover

Rate limits, endpoint-level latency, quantization, and task fitness are out of scope. Naming them
as out of scope beats letting someone believe a filter answered them.

---

## Tests that catch us getting it wrong

- If a cheap, broadly-capable auto-router surfaces as the top "quality" pick, the axes are wrong,
  not the weights.
- If a model with missing data ranks anywhere other than "unrated," rule 1 is broken.
- If a user cannot tell why a model was removed, rule 3 is broken.
- If the shortlist reads as "use this one," we have shipped the step the research says is worthless
  on its own.
- If half of someone's uploaded data vanishes without a message, we have repeated the bug we
  already found in our own example.
