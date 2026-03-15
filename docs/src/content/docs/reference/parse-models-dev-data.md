---
title: parseModelsDevData
description: Parse a raw models.dev API response into Model[].
---

[`fromModelsDev()`](/reference/from-models-dev/) fetches and parses in one call. If you've already fetched the models.dev JSON yourself (through your own caching layer, a CDN, or a build step), `parseModelsDevData()` gives you just the parsing half. Same output, no fetch.

## Signature

```ts
function parseModelsDevData(data: ModelsDevData): Model[]
```

## Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `data` | `ModelsDevData` | Raw models.dev API response. |

## Returns

`Model[]`: parsed model array. Handles `snake_case` to `camelCase` conversion, derives `openRouterId`, resolves `sdk` from provider `npm` field.

## Usage

```ts
import { parseModelsDevData, type ModelsDevData } from "pickai";
import { readFileSync } from "fs";

// You fetched https://models.dev/api.json and saved it locally
const data: ModelsDevData = JSON.parse(readFileSync("models-dev-cache.json", "utf-8"));
const models = parseModelsDevData(data);
```
