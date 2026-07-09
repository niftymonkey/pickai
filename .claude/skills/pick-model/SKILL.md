---
name: pick-model
description: >-
  Two ways to use pickai from inside its own repo. (1) DURABLE: interview the
  user about a project's needs, then generate, run, and hand off a bespoke
  pickai script that becomes that project's model-choice tool. (2) AD HOC:
  answer a one-off question about models by writing and running a throwaway
  script on the fly. Use when the user wants model recommendations for a
  project, says "pick / choose a model for X", "interview me about model
  needs", OR asks any answerable question about current models ("what are the
  fastest / cheapest / biggest-context models", "which models support X",
  "newest reasoning model from Y").
---

# pick-model

pickai is a small, composable API for filtering, scoring, and ranking AI models
against the live models.dev catalog. This skill uses it two ways. Decide which
mode you're in from the user's request, then follow that mode.

Read `reference/api-cheatsheet.md` before writing any script. It is API
reference only (exact exports, filter fields, criteria, purpose weights,
benchmark source shapes), not a library of answers. You write every script
fresh; the cheatsheet just keeps the calls correct.

## Which mode

- **Durable (Mode 1)** when the user wants a result they keep: "pick models for
  my new app", "help me choose a model for project X", "interview me". The
  deliverable is a script they take away and re-run to refresh choices.
- **Ad hoc (Mode 2)** when the user asks a question they want answered now:
  "what's the fastest reasoning model right now?", "cheapest model with vision
  and tool calling?", "which OpenAI models beat 200k context?". The deliverable
  is the ANSWER. The script is disposable scaffolding.

If genuinely ambiguous, ask which they want. Do not run an interview for a
question that just wants an answer.

---

## Mode 1: Durable interview -> take-away script

The durable artifact is THIS skill (the interview + generation logic). The
generated script is a per-project one-off that also becomes that project's
permanent "refresh my model choices" tool, because it re-fetches the live
catalog every run.

### Flow

1. **Interview** the user (below). Adaptive and conversational, not a form dump.
2. **Generate** a self-contained script at `picks/<slug>.ts` (gitignored).
3. **Run** it here and report the ranked results.
4. **Hand off**: tell the user how to drop the script into their project.

### 1. Interview

Conduct it as a real conversation. Ask one topic at a time, infer defaults from
what the user already said, skip anything already clear. For every multi-option
fork, use `AskUserQuestion` and always include a recommended option with the
reason (hard preference). Map each answer to a pickai knob:

**A. Candidate pool (hard filters -> `ModelFilter`)**
- Providers this project can call? `DIRECT_PROVIDERS`, `OPENROUTER_PROVIDERS`, a
  subset, or all? Recommend `DIRECT_PROVIDERS` when they use the Vercel AI SDK
  with their own keys.
- Required capabilities: tool calling, reasoning, structured output, vision? ->
  `toolCall`, `reasoning`, `structuredOutput`, `attachment` /
  `inputModalities: ["image"]`.
- Floors: min context, min max-output? -> `minContext`, `minOutput`.
- Cost ceiling: max $/M input (and/or output)? -> `maxCostInput`, `maxCostOutput`.
- Open-weight / self-hostable only? -> `openWeights`.
- Knowledge-cutoff floor? -> `minKnowledge`.

**B. What "best" means (scoring -> `PurposeProfile`)**
- Offer the built-in profiles first (`Cheap`, `Balanced`, `Quality`, `Coding`,
  `Creative`, `Reasoning`), one line each. Recommend the fit.
- If none fits, build a custom weighted blend of the built-in criteria
  (`costEfficiency`, `recency`, `knowledgeFreshness`, `contextCapacity`,
  `outputCapacity`). Ask the tradeoff, propose weights.

**C. Quality signal (benchmarks, adaptive)**
- Only raise when quality/intelligence matters (catalog metadata has no measure
  of how good a model is). Offer an external signal as one `minMaxCriterion` per
  source, weighted above catalog criteria:
  - **LMArena** (free, no key, human preference). Default yes when quality matters.
  - **Artificial Analysis** (objective intelligence index, needs
    `ARTIFICIAL_ANALYSIS_API_KEY`). Offer if they have a key.
  - **Both** to triangulate, or **None** for a pure catalog pick.

**D. Answer shape (`RecommendOptions` / `FindOptions`)**
- How many picks? -> `limit`.
- Diversity: `perProvider(n)`, `perFamily(n)`.
- `recommend` for scored ranking (usual); `find` for filter + sort only.

### 2. Generate

Write to `picks/<slug>.ts` (kebab-case project name). Rules:

- **Import only from `"pickai"`.** No relative imports into `src/`. This is what
  lets the same file run here (workspace dep) and in their project (npm dep).
- **Portable:** wrap logic in `async function main()` + `main()` at the bottom,
  not top-level await, so it runs in ESM or CJS-via-tsx projects.
- **Header comment captures intent:** pool, purpose, benchmark sources, answer
  shape, so a future reader knows why it picks what it picks. No em dashes, no
  comments about absent code.
- **Print a `console.table`** of results (score, name, provider, plus the
  signals that mattered).
- If a benchmark source pulls from a free mirror (LMArena), the mirror can
  rate-limit (429). Cache the download locally and read the cache on re-runs
  rather than fetching every time.
- Key-gated sources read from `process.env` and exit clearly when missing.

### 3. Run

Generated scripts import `"pickai"`, which resolves to the built `dist/`.
- Ensure `dist/` exists; run `pnpm build` if not.
- Run: `npx tsx picks/<slug>.ts`. For key-gated sources, load the env first.
- Report the table. If a live fetch errors, investigate it, do not wave it off.

### 4. Hand off

1. `pnpm add pickai` in the target project.
2. Copy `picks/<slug>.ts` in (e.g. `scripts/pick-models.ts`).
3. Run with `npx tsx scripts/pick-models.ts` (or a package script).
4. If it uses Artificial Analysis, set `ARTIFICIAL_ANALYSIS_API_KEY` there.
5. Re-run anytime; it re-fetches the live catalog, so choices stay current.

---

## Mode 2: Ad-hoc question -> throwaway script

The answer is the deliverable. Write a fresh script from THIS conversation, run
it, interpret the result in plain language, done.

**Write it fresh every time. There is deliberately no stored set of ad-hoc
scripts, and you must not build one.** Compose from the cheatsheet's primitives
based on exactly what was asked. Do not copy a previous ad-hoc script forward or
generalize one into a reusable tool; that defeats the point of writing on the
fly.

### How

1. **Write** a throwaway script in `scratch/` (gitignored). It must live in the
   repo so `import "pickai"` resolves, but it is disposable, not a deliverable.
   Name it after the question (e.g. `scratch/fastest-reasoning.ts`).
2. **Pick the data source for what was actually asked:**
   - Capabilities, cost, context/output limits, provider, recency, knowledge
     cutoff -> models.dev alone (`fromModelsDev` + `find`).
   - How good / smart -> Artificial Analysis intelligence index, or LMArena
     human preference.
   - **Speed / latency / throughput -> Artificial Analysis** (`median_output_
     tokens_per_second`, `median_time_to_first_token_seconds`,
     `median_time_to_first_answer_token`). models.dev has NO speed data. AA
     needs `ARTIFICIAL_ANALYSIS_API_KEY`.
   - Join external data to catalog models with `matchesModel`.
3. **Run** it (`npx tsx scratch/<name>.ts`; load env for key-gated sources;
   build `dist/` first if missing).
4. **Answer** in plain language. Interpret the numbers, do not just dump a
   table. Call out coverage gaps (unmatched models), missing/zero data, and any
   metric that means something subtler than it looks (e.g. reasoning-model TTFT
   includes thinking time; benchmarked speed depends on the reasoning-effort
   config, which the user can often lower).
5. **Do not hand off.** No "take this to your project" step. If the user then
   says they want to keep it, that is a switch to Mode 1: offer to graduate it
   into `picks/` as a durable script.

`scratch/` is disposable. The user can delete it anytime; nothing there is a
deliverable.
