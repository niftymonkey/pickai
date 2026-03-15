---
title: fromModelsDev
description: Fetch and parse the models.dev catalog.
---

`fromModelsDev()` is the quickest way to get a `Model[]` for use with `find()` and `recommend()`. It fetches and parses the full [models.dev](https://models.dev) catalog (3,700+ models, 100+ providers), or parses pre-fetched data if you manage caching yourself. See [Data Sources](/concepts/data-sources/) for why models.dev and how to bring your own data.

## Signature

```ts
function fromModelsDev(prefetchedData?: ModelsDevData): Promise<Model[]>
```

## Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `prefetchedData` | `ModelsDevData` | Optional. Pre-fetched API response to parse without fetching. |

## Returns

`Promise<Model[]>`: parsed model array ready for `find()` and `recommend()`.

## Behavior

- `fromModelsDev()`: Fetches from `https://models.dev/api.json` and returns parsed models. Uses the platform `fetch` API (Node 18+).
- `fromModelsDev(data)`: Parses the provided data without fetching. Useful for caching, offline use, or testing.

Internally uses [`parseModelsDevData()`](/reference/parse-models-dev-data/) to handle `snake_case` to `camelCase` conversion, `openRouterId` derivation, `sdk` resolution, and missing optional fields. Use `parseModelsDevData()` directly if you need just the parser without the fetch.

## Usage

```ts
import { fromModelsDev } from "pickai";

// Fetch live data
const models = await fromModelsDev();

// Use pre-fetched data
import { readFileSync } from "fs";
import type { ModelsDevData } from "pickai";

const cached: ModelsDevData = JSON.parse(readFileSync("api.json", "utf-8"));
const models = await fromModelsDev(cached);
```
