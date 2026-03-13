---
title: Types
description: Complete type reference for pickai.
---

## Model

The core model representation. Every model in the catalog conforms to this shape.

```ts
interface Model {
  id: string;                    // models.dev ID: "claude-sonnet-4-5", "gpt-4o"
  name: string;                  // Human-readable: "Claude Sonnet 4.5"
  provider: string;              // Provider slug: "anthropic", "openai", "google"
  openRouterId: string;          // OpenRouter slug: "anthropic/claude-sonnet-4.5"
  description?: string;          // Brief description
  cost?: ModelCost;              // Pricing (undefined = unknown)
  limit: ModelLimit;             // Token limits
  modalities: ModelModalities;   // Input/output modalities
  reasoning?: boolean;           // Chain-of-thought support
  toolCall?: boolean;            // Tool/function calling
  structuredOutput?: boolean;    // JSON mode / structured output
  openWeights?: boolean;         // Open-weights model
  attachment?: boolean;          // File/image attachments
  family?: string;               // Model family: "claude", "gpt", "gemini"
  knowledge?: string;            // Knowledge cutoff: "2024-06"
  releaseDate?: string;          // Release date: "2025-09-29"
  lastUpdated?: string;          // Last updated date
  status?: string;               // "active", "deprecated", "beta"
  sdk?: string;                  // AI SDK package: "@ai-sdk/anthropic"
}
```

## ModelCost

Pricing per 1M tokens in USD.

```ts
interface ModelCost {
  input: number;
  output: number;
  cacheRead?: number;
  cacheWrite?: number;
}
```

## ModelLimit

Token limits.

```ts
interface ModelLimit {
  context: number;   // Context window size
  output: number;    // Maximum output tokens
}
```

## ModelModalities

Input and output modality lists.

```ts
interface ModelModalities {
  input: string[];   // e.g., ["text", "image", "audio"]
  output: string[];  // e.g., ["text"]
}
```

## ScoredModel

A model with an attached score. Generic preserves the input type through scoring.

```ts
type ScoredModel<T extends Model = Model> = T & {
  score: number;  // 0-1 range, higher is better
};
```

## ModelFilter

Declarative filter. All fields are AND-combined.

```ts
interface ModelFilter {
  reasoning?: boolean;
  toolCall?: boolean;
  structuredOutput?: boolean;
  openWeights?: boolean;
  attachment?: boolean;
  maxCostInput?: number;          // USD per 1M tokens
  maxCostOutput?: number;
  minContext?: number;            // Tokens
  minOutput?: number;
  providers?: string[];           // Include only these
  excludeProviders?: string[];    // Exclude these
  inputModalities?: string[];     // Must support all listed
  outputModalities?: string[];
  excludeDeprecated?: boolean;    // Default: true
  minKnowledge?: string;          // e.g., "2024-06"
}
```

## PurposeProfile

Defines a use case for model recommendation.

```ts
interface PurposeProfile {
  filter?: ModelFilter;
  criteria: WeightedCriterion[];
}
```

## WeightedCriterion

A scoring criterion paired with its relative weight.

```ts
interface WeightedCriterion {
  criterion: ScoringCriterion;
  weight: number;
}
```

## ScoringCriterion

A function that scores a model from 0 to 1.

```ts
type ScoringCriterion = (model: Model, allModels: Model[]) => number;
```

## Constraint

A function that controls selection diversity.

```ts
type Constraint = (selected: Model[], candidate: Model) => boolean;
```

## FindOptions

Options for `find()`.

```ts
interface FindOptions {
  filter?: ModelFilter | ((model: Model) => boolean);
  sort?: "costAsc" | ((a: Model, b: Model) => number);
  limit?: number;
}
```

## RecommendOptions

Options for `recommend()`.

```ts
interface RecommendOptions {
  filter?: ModelFilter | ((model: Model) => boolean);
  constraints?: Constraint[];
  limit?: number;   // Default: 1
}
```

## Picker

The API returned by `createPicker()`.

```ts
interface Picker {
  find(options?: FindOptions): Model[];
  recommend(profile: PurposeProfile, options?: RecommendOptions): ScoredModel[];
}
```

## ParsedModelId

Result of parsing a model ID string.

```ts
interface ParsedModelId {
  provider?: string;
  modelId: string;
}
```

## ModelsDevData

The shape of the models.dev API response. Used with `fromModelsDev(data)` for pre-fetched data.

```ts
type ModelsDevData = Record<string, {
  name?: string;
  npm?: string;
  models?: Record<string, { /* raw model fields */ }>;
}>
```
