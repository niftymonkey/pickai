# Feature playbook

Every agent writing production code in this repo reads this file first and follows it.

It arrived from `the-cabinet` on 2026-08-31, adapted to pickai. The adaptation log is the last section: every section of the source is listed there with what changed and why.

It exists because an agent needs two things to do real work: a distinct bounded task, and a built-in way to verify the task is done. Generated code that looks finished is not evidence of finished. The verification is part of the task, defined before the code.

## Scope of the rules

The rule statements in `.claude/rules/` bind new code only. The v2 tree under `src/` predates them and stays as it is until it is rewritten. Bringing the existing tree up to the rules is its own piece of work, scheduled after v3 functionality exists and before a pull request opens.

## The prototype boundary

A prototype exists to teach: what is possible, what feels right, what is missing. It is never reused.

- Never lift a module out of a prototype into production code.
- Never modify a prototype to consume production modules.
- The tests inside a prototype exist so the building agent could verify its own bounded task. They are not a mark of keeper code.

Production code is built fresh by the flow below.

`web/` is a prototype. It taught the shape of the decision surface and the library constraints recorded in `design/v3-api-findings.md`, and that is the whole of what it delivers. The v3 web application is built fresh against the real library under these rules, with the prototype kept open beside it as the visual reference. No module is lifted out of it and it is never rewired to call the library.

## The per-feature flow

The flow splits by actor. The planning half belongs to the dispatching session and happens before any coding agent exists: the definition (step 1), the verification steps (step 2), and step 3's decisions, the seams, the module boundaries, and the test list. The coding agent executes: it creates the planned stubs, writes the planned placeholders, runs the TDD loop, runs the verification steps.

The steps never drop; only their size scales. Any change that adds or alters behavior runs all steps, and for a two-line fix that can mean a one-sentence definition, one verification step, one planned test, one slice. A bug fix's test plan is the red test that reproduces the bug. Only changes with no behavior at all (a rename, a comment, prose) skip the flow and run the standing checks alone.

1. **Define the thing.** State what is being built, from the design record, in observable terms: what a caller of the library or a person using the web app can see or do when it works.
2. **Define the verification steps.** Before any code: how will the agent know it truly did the task, not just produced code that resembles it? Name the tests, the checks (build, lint, a rendered check), and the observed behavior that counts as proof.
3. **Plan the tests.** The full test list is decided and categorized from the requirements and the design, then detailed further by what a proper module for this kind of thing needs. The list is pinned in the test files as named `test.todo` placeholders before implementation starts. Every planned test points at a module that exists as a stub, so a written test fails as "not implemented", never "cannot find module". The seams under test are named here by the dispatching session and carried in the coding agent's prompt; a coding agent never invents its own seams. A seam reaches Mark only when it is a genuine design decision: a new public interface something else will depend on. For v3 the settled seams live in `design/v3-api-surface.md`, and `design/v3-api-findings.md` carries the constraints the prototype proved.
4. **Run the TDD loop per the `tdd` skill.** Tests live at pre-agreed seams, red before green, one vertical slice at a time (one test, then its minimal implementation, then the next), expected values from an independent source of truth, no implementation-coupled or tautological tests. The feature is done when every planned test is written and green and every verification step from step 2 passes.

## What a plan may claim about existing code

A plan is read as fact by the agent that executes it, so a false sentence in a plan becomes a wrong edit with no red test in front of it. Three rules, all mechanical, all cheap.

1. **Every claim a plan makes about what existing code does cites a file and a line.** Not the module, the line. The point is not the citation, it is that you have to open the file to write the sentence.
2. **A plan that changes a constant lists every reader of that constant.** It is a grep and it goes in the plan.
3. **A multi-dispatch plan's module list is swept for unowned modules before the next dispatch is planned.** Every module the plan names has a dispatch that owns it, or it is recorded as unowned with a trigger. A module nobody owns is discovered late, by the dispatch that needed it.

These bind the planning half. A coding agent that finds a plan's claim about the tree to be false stops and reports it, exactly as it would for a missing seam.

## The verification menu

Step 2 picks from this menu per feature. The escalations are mandatory when they apply, never optional. Every step names its actor: Mark or the agent.

- Unit tests at the agreed seams, run with `pnpm test`. The floor, always present. Actor: the agent.
- The production build, `pnpm build` for the library and `pnpm --filter pickai-web build` for the app, plus `pnpm --filter pickai-web lint`. Editor diagnostics are not a judge; these are. Actor: the agent. There is no root `typecheck` script today; `pnpm build` runs tsup with declaration output and is the type judge until one exists.
- A change a library caller can see: an example run against the real catalog, with the output actually read. A published API surface change also updates the docs site under `docs/`. Actor: the agent.
- A change the web app renders: a rendered check of the built app, driven with `playwright-cli` and never the Playwright MCP, with the screenshot actually read. The dev server is not the judge; build first. Actor: the agent.
- A change to how the app feels to use: Mark runs it. The agent delivers the build ready and reports it ready, because only Mark can feel it. The agent never claims the feel is right.
- Live data is fetched, never fabricated. A placeholder benchmark file once read as cached-real and burned trust; see finding 8 in `design/v3-api-findings.md`. If the fetch fails, the value is absent and says so.

## The stuck rule

The dangerous state is not a red test. It is green tests plus wrong observed behavior: a rendered check or Mark says "still wrong" while the suite passes. That means the test plan has a hole, and patching without naming the hole is flailing.

- When tests are green and the behavior is wrong, the agent's first move is to pin the wrongness as a new red test at whatever layer can see it, then fix under normal red-green. Never another patch first.
- If no test the agent can run can see the wrongness (feel, visual judgment), the agent states that explicitly in its report: this property is only human-checkable.
- Three strikes at the behavior layer, then stop. After three failed attempts at making the same observed behavior right, the agent stops and reports what it tried, what it observed, and its best hypothesis. No fourth guess.
- A test is never weakened, skipped, or rewritten to reach green. If the agent believes a test itself is wrong, that is also a stop-and-report: a wrong test means the plan was wrong, and replanning is not the coding agent's call.

## Raising rule candidates

The rule set grows by verified rounds, never by an agent's judgment call. When work reaches a choice that is stylistic rather than functional, where two forms both work and the difference is how the code reads, the agent stops and shows Mark the real forms side by side, written from the code actually in hand, and asks which is the standard. The verified answer becomes a rule statement in `.claude/rules/` and its specimen goes into `design/agents/code-examples.md`.

This is bounded. It fires for how code is written and shaped: where a component gets its data and how it signals back out, how CSS reaches a component, where state is held, how a file is split, what a name says. It does not fire for product behavior, for a single variable's name, or for anything an existing rule already answers.

Building the v3 web application is where this matters next. There is no `.claude/rules/code-react.md` and there will not be one until a round is verified against real pickai components. Until then `code-core.md` and `code-typescript.md` apply to React code as they stand, and where they turn out not to fit React, that misfit is itself a candidate to raise.

## Coding standards

The rule statements live in `.claude/rules/code-core.md` (language-general, loaded into every session) and `.claude/rules/code-typescript.md` (the TypeScript forms, loaded when TypeScript files are in play). Their pinned evidence (per rule: the specimen, the chosen form, the rejected forms) lives in `design/agents/code-examples.md`; read a rule's entry there when the rule alone leaves the path forward unclear.

A concrete rule enters the record only through a verified round: the same real code from this repo written multiple ways side by side, with Mark verifying which way is the standard. An off-the-cuff sketch, including Mark's own, is never canonized into a rule. This is why `code-examples.md` starts empty here: the cabinet's specimens are PixiJS game code and no round has been run against pickai's.

## The dispatch contract

A code-writing dispatch prompt carries all of these, from the dispatching session:

- An instruction to read `design/agents/feature-playbook.md` and follow it.
- The definition of the thing, in observable terms.
- The verification steps, each with its actor (Mark or the agent).
- The seams under test.
- The module boundaries: which modules, what each is for, their public interfaces.
- The planned test list.

A coding agent handed a dispatch missing any of these stops and reports instead of filling the gap itself. A missing plan produces a visible stall, never silent improvisation.

The same flow binds a session writing code directly, with no subagent: the session plays both roles, and the plan appears as a visible message in the conversation before the first edit, sized to the work. The plan exists somewhere readable before implementation starts, always.

The coding agent's report ends with the verification steps it ran and their results, and names any step whose actor is Mark as still open. A report without verification results is not a completed task.

## Adaptation log

Every section of the cabinet's `docs/agents/feature-playbook.md`, and what happened to it here.

| Source section | Status here |
| --- | --- |
| Opening (why the playbook exists) | Kept verbatim. |
| Companion pointer to `docs/agents/lessons.md` | Dropped. `lessons.md` was not brought over; Mark chose rules plus playbook only. |
| The prototype boundary | Kept verbatim, plus one line applying it: `web/` is a prototype and the v3 app is built fresh. Settled with Mark 2026-08-31. |
| The per-feature flow | Kept. "Player or caller" became "caller of the library or a person using the web app". "A seam reaches the human" became "reaches Mark". Pointers to `v3-api-surface.md` and `v3-api-findings.md` added. |
| What a plan may claim about existing code | Kept. The cabinet's own incident detail (three false claims, the sprite-size constant) was cut, since the rules stand without it and the incident is not pickai's. |
| The verification menu | Rewritten for pickai's commands and surfaces. `pnpm typecheck` and `vite preview` do not exist here; `pnpm test`, `pnpm build`, `pnpm --filter pickai-web build`, `pnpm --filter pickai-web lint` and a `playwright-cli` rendered check replace them. The on-device input-feel step became "a change to how the app feels to use". A live-data line was added from finding 8. |
| The stuck rule | Kept verbatim, "the human" to "Mark". |
| Raising rule candidates | Not in the source. Added here so the React overlay grows the same way the TypeScript one did, by verified rounds during the work. |
| Coding standards | Kept. Ticket #59 (the cabinet's own catch-up ticket) replaced by the Scope of the rules section above. `docs/agents/code-examples.md` repointed to `design/agents/code-examples.md`, because `docs/` in pickai is the Astro docs site. A sentence added saying why the file starts empty. |
| The dispatch contract | Kept. The "for ticket-sized work the same plan also lands on the ticket" line was dropped, because pickai's v3 work is not currently driven from GitHub issues. Restore it when it is. |
