---
title: matchesModel
description: Fuzzy comparison of two model IDs.
---

The same model can have different IDs depending on the source. Benchmark data might use `"claude-3-5-sonnet-20241022"`, models.dev uses `"claude-sonnet-4-5"`, and OpenRouter uses `"anthropic/claude-sonnet-4.5"`. A simple string comparison would miss these matches. `matchesModel()` normalizes both IDs (strips provider prefixes, date suffixes, dots vs hyphens, and case) before comparing, so you can match model IDs across sources without writing your own normalization.

## Signature

```ts
function matchesModel(id: string, target: string): boolean
```

## Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | `string` | The model ID to check. |
| `target` | `string` | The target ID to match against. |

## Returns

`boolean`: `true` if the IDs refer to the same model. Handles provider prefix differences and case normalization.

## Usage

```ts
import { matchesModel } from "pickai";

// Match despite provider prefix
matchesModel("anthropic/claude-sonnet-4.5", "claude-sonnet-4-5"); // true

// Case-insensitive
matchesModel("GPT-4o", "gpt-4o"); // true
```

Useful when you have a model ID from a config file, API response, or user input and need to find it in your catalog.
