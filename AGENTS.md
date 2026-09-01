# pickai workspace instructions

## Structure

The library is the root package: source in `src/`, built with tsup. `docs/` is the Astro documentation site. `web/` is the v3 Next.js decision-surface app, built fresh against the library. `prototypes/web/` is the earlier prototype, kept runnable as a visual reference and never reused; see the prototype boundary in `design/agents/feature-playbook.md`. All four are pnpm workspace packages.

`design/` holds the project's thinking: `v3-north-star.md` (why pickai exists), `v3-decisions.md` (everything settled, with rationale), `v3-api-surface.md` (the settled v3 surface), `v3-api-findings.md` (what building the prototype proved the library must do). Read them before proposing design changes.

## Writing code here

**Read `design/agents/feature-playbook.md` before planning or writing any code.** It defines how work is defined, verified, test-planned, and handed off.

The coding rules themselves are in `.claude/rules/`: `code-core.md` is language-general and loads into every session, `code-typescript.md` carries the TypeScript forms and loads when TypeScript files are in play. They bind new code only; the v2 tree under `src/` is brought up to them as its own piece of work.

## Commands

- `pnpm test` (vitest, from the root)
- `pnpm typecheck` (tsc over `src`, tests included; `pnpm build` checks only what `dist` needs)
- `pnpm build` (tsup)
- `pnpm --filter pickai-web build` and `pnpm --filter pickai-web lint`
- `pnpm --filter pickai-web dev` runs the app on port 3200
- `pnpm --filter pickai-prototype-web dev` runs the prototype on port 3100

## Code review

Whenever a code review would normally happen, run the `coderabbit:code-review` skill rather than the built-in `code-review`. A local review cannot see untracked files: `coderabbit review` reads the git diff, so run `git add -N <path>` first or it reports a clean pass having reviewed nothing.

## Writing

**Never hard-wrap prose.** One paragraph is one line, however long it runs. One list item is one line. This covers every markdown file here, every GitHub issue body, and every issue comment. Blank lines between blocks, tables, and code fences are unaffected.

**Never use an em dash.** A comma, a colon, parentheses, or two sentences instead.
