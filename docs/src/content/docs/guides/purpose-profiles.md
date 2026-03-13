---
title: Purpose Profiles
description: Use built-in profiles or create your own to match specific use cases.
---

A `PurposeProfile` combines an optional filter with weighted scoring criteria. It represents "what kind of model do I need?"

## Built-in Profiles

pickai ships six profiles via the `Purpose` constant:

### Purpose.Cheap

Best for cost-sensitive applications. No capability filter — considers all active models.

| Criterion | Weight |
|-----------|--------|
| costEfficiency | 7 |
| contextCapacity | 3 |

### Purpose.Balanced

Equal consideration of all factors. Good default when you have no strong preference.

| Criterion | Weight |
|-----------|--------|
| costEfficiency | 1 |
| recency | 1 |
| contextCapacity | 1 |
| knowledgeFreshness | 1 |

### Purpose.Quality

Favors the newest, most knowledgeable models. Cost is a tiebreaker, not a priority.

| Criterion | Weight |
|-----------|--------|
| recency | 5 |
| knowledgeFreshness | 3 |
| contextCapacity | 2 |
| costEfficiency | 1 |

### Purpose.Coding

Filters to models with `toolCall` and `structuredOutput` support, then scores by recency and capability.

| Criterion | Weight |
|-----------|--------|
| recency | 4 |
| knowledgeFreshness | 3 |
| contextCapacity | 3 |
| costEfficiency | 1 |

### Purpose.Creative

Prioritizes large context windows for long-form content generation.

| Criterion | Weight |
|-----------|--------|
| contextCapacity | 4 |
| recency | 3 |
| knowledgeFreshness | 2 |
| costEfficiency | 1 |

### Purpose.Reasoning

Filters to models with `reasoning` support, then scores like Quality.

| Criterion | Weight |
|-----------|--------|
| recency | 5 |
| knowledgeFreshness | 3 |
| contextCapacity | 2 |
| costEfficiency | 1 |

## Creating Custom Profiles

A profile is just an object with `filter` and `criteria` fields. Use built-in criteria, custom criteria, or mix both:

```ts
import {
  costEfficiency,
  contextCapacity,
  recency,
  type PurposeProfile,
  type ScoringCriterion,
} from "pickai";

// Custom criterion: prefer models with image input
const multimodal: ScoringCriterion = (model) =>
  model.modalities.input.includes("image") ? 1 : 0;

const VisionAgent: PurposeProfile = {
  filter: {
    toolCall: true,
    inputModalities: ["image"],
    maxCostInput: 10,
  },
  criteria: [
    { criterion: multimodal, weight: 4 },
    { criterion: recency, weight: 3 },
    { criterion: contextCapacity, weight: 2 },
    { criterion: costEfficiency, weight: 1 },
  ],
};

const results = pick.recommend(VisionAgent, { limit: 3 });
```

## Profile vs. Options Filter

When you call `recommend()`, you can pass both a profile filter and an options filter. They combine with AND logic:

```ts
// Profile filter: requires toolCall + structuredOutput (from Purpose.Coding)
// Options filter: narrows to just Google models
const results = pick.recommend(Purpose.Coding, {
  filter: { providers: ["google"] },
  limit: 3,
});
```

This lets you reuse the same profile across different contexts without creating a new one each time.
