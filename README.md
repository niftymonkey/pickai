# pickai

Catalogs like [models.dev](https://models.dev) list thousands of models and their metadata. AI SDKs handle the integration: authentication, streaming, provider-specific APIs. But choosing the right model for a task, weighing pricing against capabilities, context size against cost, recency against knowledge freshness, is still a manual exercise. **pickai** is the missing layer between "here are thousands of models" and "use this one."

Zero runtime dependencies. Works everywhere (Node 18+, Deno, Bun, browsers). Powered by the [models.dev](https://models.dev) catalog.

## Quick Start

```bash
pnpm add pickai
```

```ts
import { fromModelsDev, find, recommend, Purpose, DIRECT_PROVIDERS } from "pickai";

const models = await fromModelsDev();

// Find affordable reasoning models
const reasoning = find(models, {
  filter: { reasoning: true, providers: [...DIRECT_PROVIDERS], maxCostInput: 10 },
  limit: 5,
});

// Recommend the best coding model
const [top] = recommend(models, Purpose.Coding, {
  filter: { providers: [...DIRECT_PROVIDERS] },
});
```

Every result includes ready-to-use IDs:

```ts
top.id            // "grok-4-1-fast" — for direct provider APIs and the AI SDK
top.openRouterId  // "xai/grok-4-1-fast" — for OpenRouter
top.provider      // "xai"
```

## What You Can Do

**Filter** by capabilities, cost, context size, modalities, provider, and more:

```ts
import { find, sortByCost } from "pickai";

const cheap = find(models, {
  filter: { toolCall: true, providers: [...DIRECT_PROVIDERS] },
  sort: sortByCost("asc"),
  limit: 5,
});
```

**Recommend** using built-in purpose profiles (`Cheap`, `Balanced`, `Quality`, `Coding`, `Creative`, `Reasoning`) or create your own:

```ts
const [best] = recommend(models, Purpose.Coding, {
  filter: { providers: [...DIRECT_PROVIDERS] },
  constraints: [perProvider(1)],
});
```

**Score with real benchmark data** using LMArena (Chatbot Arena) or any external quality data as custom scoring criteria. The included [benchmark example](https://pickai.niftymonkey.dev/examples/benchmark-scoring/) fetches live LMArena scores and uses them alongside built-in criteria:

```ts
import { recommend, minMaxCriterion, matchesModel, costEfficiency } from "pickai";

const arenaScore = minMaxCriterion((model) => {
  const match = benchmarks.find((b) => matchesModel(b.modelId, model.id));
  return match?.score;
});

const [best] = recommend(models, {
  criteria: [
    { criterion: arenaScore, weight: 5 },
    { criterion: costEfficiency, weight: 2 },
  ],
});
```

## API

| When you need to... | Use |
|---|---|
| Get model data | `fromModelsDev()` fetches and parses the models.dev catalog |
| Filter and sort | `find(models, options)` with declarative filters or predicates |
| Pick the best model | `recommend(models, profile, options)` with scored ranking |
| Enforce diversity | `perProvider(n)`, `perFamily(n)`, or custom constraints |
| Score directly | `scoreModels(models, criteria)` for custom pipelines |
| Match model IDs | `matchesModel(a, b)` for fuzzy cross-format comparison |
| Build custom criteria | `minMaxCriterion(getValue)` for min-max normalized scoring |
| Filter providers | `DIRECT_PROVIDERS`, `OPENROUTER_PROVIDERS`, `ALL_KNOWN_PROVIDERS` |
| Sort results | `sortByCost()`, `sortByRecency()`, `sortByContext()`, `sortByOutput()` |

See the full [documentation site](https://pickai.niftymonkey.dev) for guides, examples, and type reference.

## Development

```bash
pnpm install        # install dependencies
pnpm build          # build (tsup: ESM + CJS + .d.ts)
pnpm test           # run tests (vitest)
```

### Project structure

```text
src/
  *.ts              # One module per concern (find, recommend, score, filter, etc.)
  *.test.ts         # Co-located tests
examples/
  *.ts              # Standalone runnable examples (npx tsx examples/<name>.ts)
docs/
  src/              # Starlight documentation site
```

## Upgrading

See the [CHANGELOG](CHANGELOG.md) for breaking changes between versions.

## License

MIT
