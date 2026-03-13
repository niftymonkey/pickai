---
title: Utilities
description: Model ID utilities, filter function, and data parsing.
---

## applyFilter

Applies a declarative filter or predicate function to a model array.

```ts
function applyFilter<T extends Model>(
  models: T[],
  filter?: ModelFilter | ((model: Model) => boolean),
): T[]
```

Returns a new array. Does not mutate the input. When `filter` is `undefined`, returns the input array unchanged.

Deprecated models are excluded by default (`excludeDeprecated` defaults to `true` in `ModelFilter`).

## fromModelsDev

Creates a source function for the models.dev catalog.

```ts
function fromModelsDev(prefetchedData?: ModelsDevData): () => Promise<Model[]>
```

- `fromModelsDev()` — Returns a thunk that fetches from `https://models.dev/api.json`.
- `fromModelsDev(data)` — Returns a thunk that parses the provided data synchronously.

## parseModelsDevData

Parses a raw models.dev API response into `Model[]`.

```ts
function parseModelsDevData(data: ModelsDevData): Model[]
```

Handles snake_case → camelCase conversion, derives `openRouterId`, resolves `sdk` from provider npm field.

## ID Utilities

### normalizeModelId

```ts
function normalizeModelId(id: string): string
```

Lowercases and trims a model ID for consistent comparison.

### parseModelId

```ts
function parseModelId(id: string): ParsedModelId
```

Parses a model ID string (e.g., `"anthropic/claude-sonnet-4.5"`) into its components.

```ts
interface ParsedModelId {
  provider?: string;
  modelId: string;
}
```

### resolveProvider

```ts
function resolveProvider(id: string): string | undefined
```

Extracts the provider from a slash-prefixed ID. Returns `undefined` if no provider prefix.

### extractDirectModelId

```ts
function extractDirectModelId(id: string): string
```

Extracts the model ID portion from a `"provider/model"` format string.

### toOpenRouterFormat

```ts
function toOpenRouterFormat(provider: string, modelId: string): string
```

Combines provider and model ID into `"provider/model"` format.

### toDirectFormat

```ts
function toDirectFormat(id: string): string
```

Removes the provider prefix from a `"provider/model"` format string.

### matchesModel

```ts
function matchesModel(id: string, target: string): boolean
```

Fuzzy comparison of two model IDs. Handles provider prefix differences and case normalization.

### extractVersion

```ts
function extractVersion(id: string): string | undefined
```

Extracts version information from a model ID string (e.g., `"4.5"` from `"claude-sonnet-4-5"`).

### deriveOpenRouterId

```ts
function deriveOpenRouterId(provider: string, modelId: string): string
```

Derives the OpenRouter API slug from a provider and model ID. Handles Anthropic's dot convention (`claude-sonnet-4-5` → `anthropic/claude-sonnet-4.5`).
