# Code structure: the core rules

These rules hold in any language. The TypeScript forms live in `code-typescript.md`. Each rule's pinned side-by-side example lives in `design/agents/code-examples.md`; read a rule's entry there when the rule alone leaves the path forward unclear.

## Layout

- The standard module layout is core, satellites, shell, adapter. A dependency-free core holds the domain logic and imports nothing. Each satellite does one side concern and sees only the core. All framework code lives in one shell. The framework itself is wrapped in its own adapter.
- Three named patterns govern this and are the vocabulary to reason with: the dependency rule (all arrows point inward; the core never knows its callers), functional core, imperative shell (Bernhardt), and ports and adapters (Cockburn).
- A dependency earns its place two ways: own the promises, buy the deep. Anything carrying a core promise is written in-repo, whatever its depth. A deep problem outside the promises is bought whole. A shallow one is written.
- Wrap what spreads: a dependency called from many sites gets one adapter; a dependency used at one site is used directly there, and that site is the boundary.

## Control and state

- A display component is a dumb view: data in, pixels out. It builds its own visual body, and it contains no data source, no loop subscription, no change detection. The driver outside owns the data, the diffing, and the loop. Tests fake inputs, never outputs.
- Powers arrive as props at construction: a narrow record of callbacks and values, only what the component needs. The component signals intent outward and knows nothing about its siblings. The driver owns the graph, every hop declared in one place.
- No import-time side effects. Top-level code declares; world-changing setup lives in a named function called from the entry story. When a library registers itself by import and offers no explicit call, that import lives in the entry point only.
- An entry point is small named functions plus an orchestrator that sequences them in the order a reader would tell the story, with exactly one call at module end.

## Functions and files

- A function reads top to bottom on one screen, everything it does visible at once. Around forty lines, splitting becomes the default and staying longer needs a stated reason. A long function is several purposes wearing one name; split it by naming them.
- Guards exit at the top and the happy path runs flat. A second level of nesting means a function wants extracting.
- A file is a concept module: named for the one concept it owns, and every export serves that concept. A helper joins the file whose concept it serves; no shared concept, no shared file. A file splits by concept, never by line count.
- A module's public interface reads in one place at the module's end.

## Naming

- A public seam carries the domain glossary's word; a defined term is fully descriptive on its own. The seam function is itself the orchestrator and sequences the story.
- Private helpers are descriptive-complete: the name states the whole outcome in plain words. The testable unit shapes the function, and the name follows from what that unit does.
- A seam type is named for the role the consumer needs; a data type is the bare domain noun. The name carries the concept and nothing about what kind of type it is.
- A test name is the promise in plain words, a readable sentence. The ruling behind it lives as a comment inside the test.

## Abstraction

- Rule of three governs duplication: first copy fine, second copy fine, the third extracts the helper.
- The deletion test governs existence: a helper lives only where deleting it would scatter complexity across callers.
- Cited future governs build-ahead: generality for an absent caller is built only when that caller is written down (a ticket, an ADR, a design-record item) and the site names it. Every parameter, field, and interface member has a caller today or a citation.

## Errors

- Three buckets: an expected outcome, even a sad one, is a normal value. An external failure is a named, recoverable error. A bug fails loudly and is never caught as a strategy.
- Parse at the edge: raw data is checked exactly once, where it enters, and becomes a trusted value. Inside, the type is the proof.
- Repair by origin: live environment inputs are repaired to a safe value; documents and artifacts are rejected, never guessed at; values our own code produced are never repaired, because a bad one is a bug.
- Nearest informed owner: a recoverable error travels up only to the first layer with enough context to act, and stops there. Bugs keep flying past it.
- Contain bugs at a must-not-die region: when a bug is detected inside a region whose death punishes an innocent, the region ends cleanly by its own rules, the app survives, and the bug is preserved in the report.
- Nothing abnormal is ever silent: every repair, recovery, containment, or degradation logs what happened with enough context to reconstruct it.

## Tests

- The interface is the test surface. A module's tests do three jobs, spec, safety net, and design pressure, all aimed at the interface; a test never reaches into a module's guts.
- Tests live in a test subfolder beside the code they cover; the source folder's top level holds only production code. The test file keeps the module's name.
- Placement follows span: a test sits in the test folder of the lowest folder that contains everything it spans. A fence asserts every test imports only from inside its parent folder's subtree.
- Cross-cutting guards (invariants, lifecycle rules, architecture fences) are their own pyramid layer in their own files, named for the behavior they guard.
- A deliberate absence in production code is guarded by a test that fails if the absent thing appears; the production file may keep a short why-comment when the reason is a constraint the code cannot show.

## Comments

- A comment exists only to state a constraint the code cannot show. Rulings ride inside it.
- A file may open with a slim header: one or two lines naming the file's concept. Each constraint sits beside the code it binds, never pooled up top.
