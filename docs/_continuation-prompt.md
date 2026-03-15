# Continuation Prompt

I'm continuing work on the pickai documentation site (Issue #10, branch `feat/docs-site`). Read MEMORY.md for full context, then read `api-issues-found.md` at the project root for the list of API problems we've found during this review.

**Where we left off:** We finished reviewing the landing page and Getting Started page. The Getting Started page now has sections for Finding Models, Recommending Models, Using Your Selection (AI SDK v6 + direct API call examples), and What's Next (Purpose Profiles, Custom Scoring with Artificial Analysis benchmark teaser, Toolkit). All concept page intros have been written with "why am I here" framing.

**What still needs doing (in order):**

1. **Review remaining pages with me** (we've been going top-to-bottom through the nav):
   - Concept pages: Filtering, Scoring & Ranking, Purpose Profiles, Constraints, Data Sources (intros done, content needs review pass with me)
   - Toolkit pages: applyFilter, fromModelsDev, matchesModel, parseModelsDevData, perFamily, perProvider, scoreModels (intros done, content needs review)
   - Reference pages: Purpose, Types
   - Example pages: Basic Usage, Constraints, Custom Scoring, Custom Data Source, Filtering

2. **Create new examples** (noted in MEMORY.md TODO):
   - AI SDK v6 example: full working example calling a model (link from Getting Started)
   - Direct API call example: full working example calling provider API (link from Getting Started)
   - Benchmark scoring example: full working Artificial Analysis criterion example (link from Getting Started)
   - Once these exist, update Getting Started to link to them

3. **After all pages are reviewed, prepare for commit:**
   - Remove `vite: { server: { allowedHosts: true } }` from astro.config.mjs
   - Remove dev dependencies (ai, @ai-sdk/openai, @ai-sdk/anthropic) from package.json
   - Stash non-docs changes (src/ changes like purpose.ts, source.ts, types.ts, index.ts, deleted picker.ts, etc.) so they can be applied later when we fix the API issues
   - Commit only the documentation-related work to this branch

4. **Create GitHub issue from `api-issues-found.md`** describing the API problems found during docs review

5. **In a separate branch, fix the API issues:**
   - Un-stash the src/ changes from step 3
   - Implement the fixes described in the GitHub issue
   - Merge that PR

6. **Come back to `feat/docs-site`, rebase onto main**, verify everything still works, then create the docs PR

**Important working style notes:**
- Always test example code in the playground (`examples/_playground.ts`) before putting it in docs
- No em dashes anywhere (not even `--` which renders as em dashes)
- The Astro dev server should be running on port 3456 for live preview
- API keys for testing AI SDK calls are in `/home/mlo/dev/niftymonkey/ai-consensus/.env.local.bak`

Ready to continue reviewing pages? Let's pick up where we left off.
