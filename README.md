# pickai

Model intelligence library — classify, score, filter, and recommend AI models based on task requirements.

The Vercel AI SDK solves *calling* models. OpenRouter gives you a *catalog*. **pickai** helps you *choose* the right model.

## Packages

| Package | Description |
|---------|------------|
| [`@pickai/core`](./packages/core) | Pure functions for ID normalization, classification, scoring, and recommendation. Zero runtime deps. |
| `@pickai/server` | Provider availability checking (planned) |
| `@pickai/react` | Headless hook + reference component (planned) |
| `@pickai/models` | Curated model data for known models (planned) |

## Quick Start

```bash
pnpm add @pickai/core
```

```typescript
import { normalizeModelId, matchesModel, formatContextWindow } from "@pickai/core";

// Cross-format model matching
matchesModel("anthropic/claude-3.5-haiku", "claude-3-5-haiku-20241022"); // true

// Display formatting
formatContextWindow(128000); // "128K"
```

## Development

```bash
pnpm install
pnpm build
pnpm test
```

## License

MIT
