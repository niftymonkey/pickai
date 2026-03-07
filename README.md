# pickai

AI SDKs solve calling models. Model routers give you a catalog. But choosing the *right* model for a task — comparing pricing, matching capabilities, handling different ID formats across providers — that logic keeps getting rewritten in every app. **pickai** is the missing layer between "here are 300 models" and "use this one."

Zero runtime dependencies, works everywhere (browser, Node, edge). Built on [OpenRouter's model catalog](https://openrouter.ai/api/v1/models) — the only API that provides pricing, context windows, and capabilities across all major providers in one place.

## Quick Start

```bash
pnpm add pickai
```

```typescript
import { parseOpenRouterCatalog, enrich, recommend, Purpose } from "pickai";

const response = await fetch("https://openrouter.ai/api/v1/models");
const models = parseOpenRouterCatalog(await response.json()).map(enrich);

const [model] = recommend(models, Purpose.Balanced); // → top standard-tier model
```

Every result has ready-to-use IDs for calling the model:

```typescript
model.apiSlugs.openRouter;  // "anthropic/claude-sonnet-4-5" — for OpenRouter API
model.apiSlugs.direct;      // "claude-sonnet-4-5-20250929"  — for provider APIs / Vercel AI SDK
```

### More you can do

```typescript
import { groupByProvider, Tier, Cost } from "pickai";

recommend(models, Purpose.Cheap, { count: 3 });      // top 3 efficient-tier models
recommend(models, Purpose.Quality);                  // newest flagship-tier models

const groups = groupByProvider(models);             // organize by provider for UI
models.filter(m => m.costTier <= Cost.Standard);    // affordable models
models.filter(m => m.tier >= Tier.Standard);        // capable models
```

### Customize

`recommend()` accepts custom profiles with any mix of built-in and custom scoring criteria — including external benchmark data:

```typescript
import { recommend, costEfficiency, recency, contextCapacity, Tier } from "pickai";

recommend(models, {
  preferredTier: Tier.Standard,
  criteria: [
    { criterion: costEfficiency, weight: 0.5 },
    { criterion: recency, weight: 0.3 },
    { criterion: contextCapacity, weight: 0.2 },
  ],
  require: { tools: true },
});
```

See [Built-in Profiles](docs/getting-started.md#built-in-profiles), [Custom Profiles](docs/getting-started.md#custom-profiles), and the [Scoring guide](docs/scoring.md) for external benchmark integration.

## API

| When you need to... | Use |
|----------------------|-----|
| Get data in | `parseOpenRouterCatalog()` — turns the OpenRouter response into `Model[]` |
| Pick a model | `recommend(models, purpose)` — scores, filters, and returns the best match |
| Prepare for UI | `enrich()` adds display labels and tiers; `groupByProvider()` organizes into provider sections |
| Blend in benchmarks | `recommend()` with custom criteria, or `scoreModels()` for full control — see [Scoring](docs/scoring.md) |

See the full [API Reference](docs/api.md) for types, and the topic guides for [Getting Started](docs/getting-started.md), [Scoring](docs/scoring.md), [Classification](docs/classification.md), and [Utilities](docs/utilities.md).

## Development

```bash
pnpm install        # install dependencies
pnpm build          # build (tsup → ESM + CJS + .d.ts)
pnpm test           # run tests (vitest)
pnpm update-fixture # refresh OpenRouter model fixture
```

### Project structure

```
src/
  adapters/           # Provider-specific parsers (OpenRouter)
  with-*.ts           # Composable enrichers (classification, display labels, AA slug)
  enrich.ts           # Convenience wrapper composing with* functions
  *.ts                # One module per concern (classify, score, group, etc.)
  *.test.ts           # Co-located tests
scripts/
  update-openrouter-fixture.sh
  check-aa-slugs.ts   # Validate AA slug derivation against live data
```

### Testing

Three layers of tests catch different classes of problems:

- **Unit tests** (`*.test.ts` co-located with each module) — verify individual functions in isolation using synthetic fixtures from `src/test-utils.ts`. Catch logic regressions in classification, scoring, formatting, ID normalization, etc.
- **Integration tests** (`integration.test.ts`) — exercise the full pipeline (`parseOpenRouterCatalog → enrich → recommend/score/select/group`) against the real OpenRouter fixture. Catch cross-module regressions where changes in one module (e.g., tier classification thresholds) silently break downstream behavior (e.g., recommendation results).
- **Smoke tests** (`smoke.test.ts`) — verify that every public export from both entry points (`pickai` and `pickai/adapters`) resolves correctly. Catch broken barrel exports — the kind of bug where the library builds fine but consumers get `undefined` at runtime because an export was renamed or removed.

Run `pnpm build` before committing to catch type errors that vitest might miss.

## License

MIT
