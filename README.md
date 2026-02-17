# pickai

AI SDKs solve calling models. Model routers give you a catalog. But choosing the *right* model for a task — comparing pricing, matching capabilities, handling different ID formats across providers — that logic keeps getting rewritten in every app. **pickai** is the missing layer between "here are 300 models" and "use this one."

Zero runtime dependencies, works everywhere (browser, Node, edge). Built on [OpenRouter's model catalog](https://openrouter.ai/api/v1/models) — the only API that provides pricing, context windows, and capabilities across all major providers in one place.

## Quick Start

```bash
pnpm add pickai
```

```typescript
import {
  parseOpenRouterCatalog,
  enrich, groupByProvider,
  recommend, Purpose,
  Tier, Cost,
} from "pickai";

// Fetch the full model catalog from OpenRouter
const response = await fetch("https://openrouter.ai/api/v1/models");
// Parse and enrich with tier, cost, and display fields
const models = parseOpenRouterCatalog(await response.json()).map(enrich);

// Recommend the best model for a purpose
const model = recommend(models, Purpose.Balanced); // → top standard-tier model
recommend(models, Purpose.Cheap, { count: 3 });    // → top 3 efficient-tier models
recommend(models, Purpose.Coding);                 // → standard-tier with tool calling

// Group by provider for dropdowns, sections, or any grouped UI
const groups = groupByProvider(models);
// → [
//   { provider: "anthropic", providerName: "Anthropic", models: [...] },
//   { provider: "openai",    providerName: "OpenAI",    models: [...] },
//   ...
// ]

// Filter on enriched fields
models.filter(m => m.costTier <= Cost.Standard);  // affordable models
models.filter(m => m.tier >= Tier.Standard);       // capable models

// Call the model — every result has ready-to-use IDs

// Call OpenRouter with model.openRouterId
const routed = await fetch("https://openrouter.ai/api/v1/chat/completions", {
  body: JSON.stringify({ model: model.openRouterId, messages }), // "anthropic/claude-sonnet-4-5"
});

// Call a provider API directly with model.apiId
const direct = await fetch("https://api.anthropic.com/v1/messages", {
  body: JSON.stringify({ model: model.apiId, messages }), // "claude-sonnet-4-5-20250929"
});

// Call Vercel AI SDK's generateText with model.apiId
const { text } = await generateText({ model: anthropic(model.apiId), messages });
```

### Custom Profiles

The built-in purposes cover common cases, but `recommend()` also accepts a profile object directly — define your own tier preference, scoring weights, and requirements:

```typescript
recommend(models, {
  preferredTier: Tier.Standard,
  weights: { cost: 0.5, quality: 0.3, context: 0.2 },
  require: { tools: true },
  exclude: { patterns: ["gpt"] },
});
```

See [Built-in Profiles](docs/api.md#built-in-profiles) for the full list and [Custom Profiles](docs/api.md#custom-profiles) for all available options.

## API

| When you need to... | Use |
|----------------------|-----|
| Get data in | `parseOpenRouterCatalog()` — turns the OpenRouter response into `Model[]` |
| Pick a model | `recommend(models, purpose)` — scores, filters, and returns the best match |
| Prepare for UI | `enrich()` adds display labels and tiers; `groupByProvider()` organizes into provider sections |
| Go deeper | `scoreModels()` and `selectModels()` for custom scoring weights and selection constraints |

See the full [API Reference](docs/api.md) for detailed usage, code examples, and configuration options.

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
  adapters/   # Provider-specific parsers (OpenRouter)
  *.ts        # One module per concern (classify, score, enrich, group, etc.)
  *.test.ts   # Co-located tests
scripts/
  update-openrouter-fixture.sh
```

### Testing

Three layers of tests catch different classes of problems:

- **Unit tests** (`*.test.ts` co-located with each module) — verify individual functions in isolation using synthetic fixtures from `src/test-utils.ts`. Catch logic regressions in classification, scoring, formatting, ID normalization, etc.
- **Integration tests** (`integration.test.ts`) — exercise the full pipeline (`parseOpenRouterCatalog → enrich → recommend/score/select/group`) against the real OpenRouter fixture. Catch cross-module regressions where changes in one module (e.g., tier classification thresholds) silently break downstream behavior (e.g., recommendation results).
- **Smoke tests** (`smoke.test.ts`) — verify that every public export from both entry points (`pickai` and `pickai/adapters`) resolves correctly. Catch broken barrel exports — the kind of bug where the library builds fine but consumers get `undefined` at runtime because an export was renamed or removed.

Run `pnpm build` before committing to catch type errors that vitest might miss.

## License

MIT
