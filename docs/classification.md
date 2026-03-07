# Classification

[Back to API Reference](api.md) | [Back to README](../README.md)

## Capability Tier

`classifyTier` categorizes models by capability based on naming patterns and pricing:

| Tier | Signal | Examples |
|------|--------|----------|
| `Tier.Efficient` | mini, nano, flash, haiku, lite, tiny, small | Haiku, GPT-4o Mini, Gemini Flash |
| `Tier.Standard` | Everything else | Sonnet, GPT-4o, Gemini |
| `Tier.Flagship` | opus, ultra, pro, or input >= $10/M | Opus, GPT-5 Pro, o1 Pro |

```typescript
import { classifyTier, Tier } from "pickai";

classifyTier(model) === Tier.Flagship
```

## Cost Tier

`classifyCostTier` categorizes models by input pricing per 1M tokens. Boundaries based on the OpenRouter catalog (Feb 2026):

| Tier | Input Price | Examples |
|------|-------------|----------|
| `Cost.Free` | $0 | Free-tier models |
| `Cost.Budget` | < $2/M | Haiku ($1), GPT-4o Mini ($0.15) |
| `Cost.Standard` | $2 - $10/M | Sonnet ($3), GPT-4o ($2.50), Opus 4.5 ($5) |
| `Cost.Premium` | $10 - $20/M | Opus 4 ($15), o1 ($15), GPT-4 Turbo ($10) |
| `Cost.Ultra` | >= $20/M | o3-pro ($20), GPT-5.2 Pro ($21), o1-pro ($150) |

```typescript
import { classifyCostTier, Cost } from "pickai";

classifyCostTier(model) === Cost.Premium
```

## Filtering by Range

Ordinal helpers return predicates for use with `.filter()`:

```typescript
import { maxCost, minTier, Tier, Cost } from "pickai";

// Affordable models (free + budget + standard)
models.filter(maxCost(Cost.Standard));

// Capable models (standard + flagship)
models.filter(minTier(Tier.Standard));
```

For combining multiple filters, enriched models read more naturally:

```typescript
models.map(enrich).filter(m =>
  m.costTier <= Cost.Standard && m.tier >= Tier.Standard
);
```

All four predicates: `maxTier`, `minTier`, `maxCost`, `minCost`.

## Capability Checks

```typescript
import { supportsTools, supportsVision, isTextFocused } from "pickai";

supportsTools(model);  // true if capabilities.tools is set
supportsVision(model); // true if capabilities.vision or image input modality
isTextFocused(model);  // true if outputs text only (no image/audio/video)
```
