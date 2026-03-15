---
title: Purpose Profiles
description: Use built-in profiles or create your own to match specific use cases.
---

Every call to [`recommend()`](/reference/recommend/) needs [filters](/concepts/filtering/), [criteria, and weights](/concepts/scoring/). A [`PurposeProfile`](/reference/types/#purposeprofile) bundles all three into a reusable object: "find me the best coding model" or "find me the cheapest option" in a single argument.

## Built-in Profiles

pickai ships six profiles via the `Purpose` constant. Weights are relative. See [Scoring & Ranking](/concepts/scoring/) for how weights and criteria produce scores.

:::note[Built-in profiles score on metadata, not quality]
These profiles use cost, context size, recency, and knowledge freshness as scoring criteria. Models with aggressive specs (large context windows, low pricing) can rank highly even if they aren't the strongest performers. For quality-aware scoring, add benchmark data as a [custom criterion](/concepts/scoring/#writing-custom-criteria). See the [Benchmark Scoring](/examples/benchmark-scoring/) example for a working implementation.
:::

### Purpose.Cheap

**Filter:** none

| Criterion | Weight |
|---|---|
| costEfficiency | 7 |
| recency | 1 |

### Purpose.Balanced

**Filter:** none

| Criterion | Weight |
|---|---|
| costEfficiency | 1 |
| recency | 1 |
| contextCapacity | 1 |
| outputCapacity | 1 |
| knowledgeFreshness | 1 |

### Purpose.Quality

**Filter:** none

| Criterion | Weight |
|---|---|
| recency | 5 |
| knowledgeFreshness | 3 |
| contextCapacity | 2 |
| outputCapacity | 2 |
| costEfficiency | 1 |

### Purpose.Coding

**Filter:** `toolCall: true`

| Criterion | Weight |
|---|---|
| recency | 4 |
| knowledgeFreshness | 3 |
| contextCapacity | 3 |
| outputCapacity | 2 |
| costEfficiency | 1 |

:::caution[Why not filter on structuredOutput?]
The `structured_output` field has limited coverage in the models.dev catalog (under 40% of models report it). Requiring it would silently exclude models that support it but don't report it, including all Anthropic models. Add `structuredOutput: true` to your [options filter](/concepts/filtering/#combining-filters-in-recommend) if you need it.
:::

### Purpose.Creative

**Filter:** none

| Criterion | Weight |
|---|---|
| contextCapacity | 4 |
| recency | 3 |
| knowledgeFreshness | 2 |
| outputCapacity | 1 |
| costEfficiency | 1 |

### Purpose.Reasoning

**Filter:** `reasoning: true`

| Criterion | Weight |
|---|---|
| recency | 5 |
| knowledgeFreshness | 3 |
| outputCapacity | 2 |
| contextCapacity | 2 |
| costEfficiency | 1 |

## Creating Custom Profiles

A profile is just an object with `filter` and `criteria` fields. Use built-in criteria, custom criteria, or mix both:

```ts
import {
  fromModelsDev,
  recommend,
  costEfficiency,
  contextCapacity,
  recency,
  OPENROUTER_PROVIDERS,
  type PurposeProfile,
  type ScoringCriterion,
} from "pickai";

const models = await fromModelsDev();

// Custom criterion: prefer models with vision support
const supportsVision: ScoringCriterion = (model) =>
  model.modalities.input.includes("image") ? 1 : 0;

const VisionAgent: PurposeProfile = {
  filter: {
    providers: [...OPENROUTER_PROVIDERS],
    toolCall: true,
    maxCostInput: 10,
  },
  criteria: [
    { criterion: supportsVision, weight: 4 },
    { criterion: recency, weight: 3 },
    { criterion: contextCapacity, weight: 2 },
    { criterion: costEfficiency, weight: 1 },
  ],
};

const results = recommend(models, VisionAgent, { limit: 3 });
```

## Profile vs. Options Filter

When you call `recommend()`, you can pass both a profile filter and an options filter. They combine with AND logic:

```ts
import { recommend, Purpose, DIRECT_PROVIDERS } from "pickai";

// Profile filter: requires toolCall (from Purpose.Coding)
// Options filter: narrows to direct-API providers
const results = recommend(models, Purpose.Coding, {
  filter: { providers: [...DIRECT_PROVIDERS] },
  limit: 3,
});
```

You can narrow further to a single provider, or extend the list with your own:

```ts
// Just Google models
const google = recommend(models, Purpose.Coding, {
  filter: { providers: ["google"] },
  limit: 3,
});

// Direct providers plus a local setup
const withLocal = recommend(models, Purpose.Coding, {
  filter: { providers: [...DIRECT_PROVIDERS, "ollama-cloud"] },
  limit: 3,
});
```

This lets you reuse the same profile across different contexts without creating a new one each time. See [Provider Constants](/concepts/filtering/#provider-constants) for the available lists.
