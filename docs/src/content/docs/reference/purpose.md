---
title: Purpose
description: Built-in purpose profiles for common use cases.
---

## Purpose

```ts
const Purpose: {
  Cheap: PurposeProfile;
  Balanced: PurposeProfile;
  Quality: PurposeProfile;
  Coding: PurposeProfile;
  Creative: PurposeProfile;
  Reasoning: PurposeProfile;
}
```

A namespace of six built-in `PurposeProfile` objects. Pass any of them to `recommend()`.

```ts
import { Purpose } from "pickai";

const [best] = pick.recommend(Purpose.Coding);
```

## Profiles

### Purpose.Cheap

Best for cost-sensitive applications.

- **Filter:** None (all active models)
- **Criteria:** costEfficiency (7), contextCapacity (3)

### Purpose.Balanced

Equal consideration across all dimensions.

- **Filter:** None
- **Criteria:** costEfficiency (1), recency (1), contextCapacity (1), knowledgeFreshness (1)

### Purpose.Quality

Favors the newest, most knowledgeable models.

- **Filter:** None
- **Criteria:** recency (5), knowledgeFreshness (3), contextCapacity (2), costEfficiency (1)

### Purpose.Coding

For code generation, tool use, and structured output tasks.

- **Filter:** `{ toolCall: true, structuredOutput: true }`
- **Criteria:** recency (4), knowledgeFreshness (3), contextCapacity (3), costEfficiency (1)

### Purpose.Creative

For long-form content, brainstorming, and writing.

- **Filter:** None
- **Criteria:** contextCapacity (4), recency (3), knowledgeFreshness (2), costEfficiency (1)

### Purpose.Reasoning

For chain-of-thought, math, and complex analysis tasks.

- **Filter:** `{ reasoning: true }`
- **Criteria:** recency (5), knowledgeFreshness (3), contextCapacity (2), costEfficiency (1)

## PurposeProfile Type

```ts
interface PurposeProfile {
  filter?: ModelFilter;
  criteria: WeightedCriterion[];
}
```

You can create custom profiles with the same shape. See [Purpose Profiles guide](/guides/purpose-profiles/) for details.
