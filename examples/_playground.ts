/**
 * Comprehensive doc example verification.
 * Tests all executable code snippets from documentation pages.
 * Run: npx tsx examples/_playground.ts
 */

import {
  fromModelsDev,
  find,
  recommend,
  applyFilter,
  scoreModels,
  matchesModel,
  minMaxCriterion,
  parseModelsDevData,
  Purpose,
  perProvider,
  perFamily,
  sortByCost,
  sortByContext,
  costEfficiency,
  contextCapacity,
  recency,
  DIRECT_PROVIDERS,
  OPENROUTER_PROVIDERS,
  ALL_KNOWN_PROVIDERS,
  type Model,
  type Constraint,
  type ScoringCriterion,
  type PurposeProfile,
  type ScoredModel,
  type ModelsDevData,
} from "pickai";

import { readFileSync } from "fs";

const models = await fromModelsDev();
let pass = 0;
let fail = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    pass++;
    console.log(`  PASS | ${name}`);
  } catch (e: any) {
    fail++;
    console.log(`  FAIL | ${name}: ${e.message}`);
  }
}

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(msg);
}

// ============================================
// Getting Started - Finding Models
// ============================================
console.log("\n--- Getting Started: Finding Models ---");

test("vision models with cost filter", () => {
  const vision = find(models, {
    filter: { inputModalities: ["image"], maxCostInput: 5 },
    limit: 10,
  });
  assert(vision.length > 0, "no results");
  assert(vision.length <= 10, "exceeded limit");
});

test("tool-calling models sorted by cost", () => {
  const tools = find(models, {
    filter: { toolCall: true },
    sort: sortByCost("asc"),
    limit: 10,
  });
  assert(tools.length > 0, "no results");
  assert(tools.length <= 10, "exceeded limit");
});

// ============================================
// Getting Started - Recommending Models
// ============================================
console.log("\n--- Getting Started: Recommending Models ---");

test("top-scored coding model", () => {
  const [top] = recommend(models, Purpose.Coding);
  assert(top != null, "no result");
  assert(top.score > 0, "score is 0");
});

test("top 5 reasoning models from anthropic", () => {
  const reasoning = recommend(models, Purpose.Reasoning, {
    filter: { providers: ["anthropic"] },
    limit: 5,
  });
  assert(reasoning.length > 0, "no results");
  assert(reasoning.every((m) => m.provider === "anthropic"), "wrong provider");
});

// ============================================
// Filtering Concept Page
// ============================================
console.log("\n--- Filtering Concept ---");

test("declarative filter: anthropic + openai with tool call", () => {
  const results = find(models, {
    filter: {
      providers: ["anthropic", "openai"],
      toolCall: true,
      minContext: 100_000,
      maxCostInput: 10,
    },
  });
  assert(results.length > 0, "no results");
  assert(results.every((m) => ["anthropic", "openai"].includes(m.provider)), "wrong provider");
});

test("provider constants extend", () => {
  const results = find(models, {
    filter: { providers: [...DIRECT_PROVIDERS, "my-local-provider"] },
  });
  assert(results.length > 0, "no results");
});

test("predicate filter: output/context ratio", () => {
  const results = find(models, {
    filter: (m) => m.limit.output / m.limit.context >= 0.25,
  });
  assert(results.length > 0, "no results");
  assert(results.every((m) => m.limit.output / m.limit.context >= 0.25), "ratio check failed");
});

test("combining filters in recommend", () => {
  const results = recommend(models, Purpose.Coding, {
    filter: { providers: ["openai"], structuredOutput: true },
    limit: 5,
  });
  assert(results.length > 0, "no results");
});

// ============================================
// Scoring Concept Page
// ============================================
console.log("\n--- Scoring Concept ---");

test("PurposeProfile with weights", () => {
  const profile: PurposeProfile = {
    criteria: [
      { criterion: costEfficiency, weight: 7 },
      { criterion: contextCapacity, weight: 3 },
    ],
  };
  const results = recommend(models, profile, { limit: 3 });
  assert(results.length === 3, "wrong count");
});

test("binary criterion: supportsVision", () => {
  const supportsVision: ScoringCriterion = (model) => {
    return model.modalities.input.includes("image") ? 1 : 0;
  };
  const score = supportsVision(models[0], models);
  assert(score === 0 || score === 1, "not binary");
});

test("relative criterion: aboveMedianContext", () => {
  const aboveMedianContext: ScoringCriterion = (model, allModels) => {
    const sorted = allModels.map((m) => m.limit.context).sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    return model.limit.context >= median ? 1 : 0;
  };
  const score = aboveMedianContext(models[0], models);
  assert(score === 0 || score === 1, "not binary");
});

test("scoreModels directly", () => {
  const scored = scoreModels(models.slice(0, 20), [
    { criterion: costEfficiency, weight: 3 },
    { criterion: recency, weight: 1 },
  ]);
  assert(scored.length === 20, "wrong count");
  assert(scored[0].score >= scored[1].score, "not sorted");
});

// ============================================
// Purpose Profiles Concept Page
// ============================================
console.log("\n--- Purpose Profiles Concept ---");

test("custom VisionAgent profile with OPENROUTER_PROVIDERS", () => {
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
  assert(results.length === 3, "wrong count");
});

test("profile vs options filter with DIRECT_PROVIDERS", () => {
  const results = recommend(models, Purpose.Coding, {
    filter: { providers: [...DIRECT_PROVIDERS] },
    limit: 3,
  });
  assert(results.length === 3, "wrong count");
  assert(results.every((m) => (DIRECT_PROVIDERS as readonly string[]).includes(m.provider)), "wrong provider");
});

test("google only filter", () => {
  const google = recommend(models, Purpose.Coding, {
    filter: { providers: ["google"] },
    limit: 3,
  });
  assert(google.length > 0, "no results");
  assert(google.every((m) => m.provider === "google"), "wrong provider");
});

test("direct providers plus ollama-cloud", () => {
  const withLocal = recommend(models, Purpose.Coding, {
    filter: { providers: [...DIRECT_PROVIDERS, "ollama-cloud"] },
    limit: 3,
  });
  assert(withLocal.length === 3, "wrong count");
});

// ============================================
// Constraints Concept Page
// ============================================
console.log("\n--- Constraints Concept ---");

test("perProvider constraint", () => {
  const results = recommend(models, Purpose.Coding, {
    filter: { providers: [...DIRECT_PROVIDERS] },
    constraints: [perProvider(2)],
    limit: 10,
  });
  assert(results.length === 10, "wrong count");
});

test("perFamily constraint", () => {
  const results = recommend(models, Purpose.Balanced, {
    filter: { providers: [...DIRECT_PROVIDERS] },
    constraints: [perFamily(1)],
    limit: 5,
  });
  assert(results.length === 5, "wrong count");
});

test("custom limitCostly constraint", () => {
  const limitCostly: Constraint = (selected, candidate) => {
    const isCostly = (m: Model) => (m.cost?.input ?? 0) > 3;
    if (!isCostly(candidate)) return true;
    return selected.filter(isCostly).length < 2;
  };
  const results = recommend(models, Purpose.Coding, {
    filter: { providers: [...DIRECT_PROVIDERS] },
    constraints: [perProvider(2), perFamily(1), limitCostly],
    limit: 10,
  });
  assert(results.length === 10, "wrong count");
});

// ============================================
// Data Sources Concept Page
// ============================================
console.log("\n--- Data Sources Concept ---");

test("fromModelsDev returns models", () => {
  assert(models.length > 0, "no models");
});

test("parseModelsDevData with cached data", () => {
  const cached: ModelsDevData = JSON.parse(readFileSync("examples/_api-cache.json", "utf-8"));
  const parsed = parseModelsDevData(cached);
  assert(parsed.length > 0, "no models parsed");
});

test("custom source data", () => {
  const custom: Model[] = [
    {
      id: "claude-sonnet-4-5",
      name: "Claude Sonnet 4.5",
      provider: "anthropic",
      openRouterId: "anthropic/claude-sonnet-4.5",
      cost: { input: 3, output: 15 },
      limit: { context: 200_000, output: 16_384 },
      modalities: { input: ["text", "image"], output: ["text"] },
      reasoning: true,
      toolCall: true,
      structuredOutput: true,
      family: "claude-sonnet",
      releaseDate: "2025-02-24",
      knowledge: "2025-04",
    },
    {
      id: "gpt-4o",
      name: "GPT-4o",
      provider: "openai",
      openRouterId: "openai/gpt-4o",
      cost: { input: 2.5, output: 10 },
      limit: { context: 128_000, output: 16_384 },
      modalities: { input: ["text", "image", "audio"], output: ["text"] },
      toolCall: true,
      structuredOutput: true,
      family: "gpt",
      releaseDate: "2024-05-13",
      knowledge: "2024-10",
    },
  ];
  const results = recommend(custom, Purpose.Coding);
  assert(results.length === 1, "wrong count");
});

// ============================================
// Find Reference Page
// ============================================
console.log("\n--- Find Reference ---");

test("sortByCost asc", () => {
  const cheap = find(models, {
    filter: { providers: [...DIRECT_PROVIDERS] },
    sort: sortByCost("asc"),
    limit: 5,
  });
  assert(cheap.length === 5, "wrong count");
  for (let i = 0; i < cheap.length - 1; i++) {
    if (cheap[i].cost?.input != null && cheap[i + 1].cost?.input != null) {
      assert(cheap[i].cost!.input <= cheap[i + 1].cost!.input, "not sorted asc");
    }
  }
});

test("sortByCost desc", () => {
  const pricey = find(models, {
    filter: { providers: [...DIRECT_PROVIDERS] },
    sort: sortByCost("desc"),
    limit: 5,
  });
  assert(pricey.length === 5, "wrong count");
  for (let i = 0; i < pricey.length - 1; i++) {
    if (pricey[i].cost?.input != null && pricey[i + 1].cost?.input != null) {
      assert(pricey[i].cost!.input >= pricey[i + 1].cost!.input, "not sorted desc");
    }
  }
});

test("sortByContext desc", () => {
  const big = find(models, {
    filter: { providers: [...DIRECT_PROVIDERS] },
    sort: sortByContext("desc"),
    limit: 3,
  });
  assert(big.length === 3, "wrong count");
  assert(big[0].limit.context >= big[1].limit.context, "not sorted");
});

test("custom filter without providers", () => {
  const affordable = find(models, {
    filter: (m) => (m.cost?.input ?? 0) < 1,
    sort: (a, b) => b.limit.context - a.limit.context,
  });
  assert(affordable.length > 0, "no results");
});

// ============================================
// Recommend Reference Page
// ============================================
console.log("\n--- Recommend Reference ---");

test("single best with DIRECT_PROVIDERS", () => {
  const [best] = recommend(models, Purpose.Coding, {
    filter: { providers: [...DIRECT_PROVIDERS] },
  });
  assert(best != null, "no result");
});

test("top 5 with perProvider diversity", () => {
  const diverse = recommend(models, Purpose.Coding, {
    filter: { providers: [...DIRECT_PROVIDERS] },
    constraints: [perProvider(1)],
    limit: 5,
  });
  assert(diverse.length === 5, "wrong count");
  const providers = new Set(diverse.map((m) => m.provider));
  assert(providers.size === 5, "not diverse");
});

test("empty result for nonexistent provider", () => {
  const none = recommend(models, Purpose.Coding, {
    filter: { providers: ["nonexistent"] },
  });
  assert(none.length === 0, "should be empty");
});

// ============================================
// Utilities Reference Pages
// ============================================
console.log("\n--- Utilities ---");

test("applyFilter declarative", () => {
  const reasoning = applyFilter(models, { reasoning: true });
  assert(reasoning.length > 0, "no results");
  assert(reasoning.every((m) => m.reasoning === true), "filter failed");
});

test("applyFilter predicate", () => {
  const cheap = applyFilter(models, (m) => (m.cost?.input ?? Infinity) < 1);
  assert(cheap.length > 0, "no results");
});

test("matchesModel across formats", () => {
  assert(matchesModel("anthropic/claude-sonnet-4.5", "claude-sonnet-4-5") === true, "should match");
  assert(matchesModel("GPT-4o", "gpt-4o") === true, "should match case-insensitive");
});

test("minMaxCriterion", () => {
  const cheapest = minMaxCriterion((model) => model.cost?.input, true);
  const subset = models.filter((m) => m.cost?.input != null).slice(0, 10);
  const score = cheapest(subset[0], subset);
  assert(score >= 0 && score <= 1, "score out of range");
});

test("ALL_KNOWN_PROVIDERS is superset of DIRECT_PROVIDERS", () => {
  for (const p of DIRECT_PROVIDERS) {
    assert(
      (ALL_KNOWN_PROVIDERS as readonly string[]).includes(p),
      `${p} missing from ALL_KNOWN_PROVIDERS`,
    );
  }
});

// ============================================
// Summary
// ============================================
console.log(`\n=== ${pass} passed, ${fail} failed ===`);
if (fail > 0) process.exit(1);
