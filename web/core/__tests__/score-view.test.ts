import { expect, test } from "vitest";
import type { BenchmarkSet, Model, ModelIdentity } from "pickai";
import {
  blendSummary,
  defaultWeights,
  keepMetrics,
  metricList,
  rateIdentities,
  scoreBoard,
  stepWeight,
} from "../score-view";

// Fixture ids checked against normalizeModelId: each folds to itself.
const listing = (id: string, name: string, provider: string): Model => ({
  id,
  name,
  provider,
  limit: { context: 128_000, output: 16_384 },
  modalities: { input: ["text"], output: ["text"] },
  openRouterId: `${provider}/${id}`,
});

const identity = (id: string, name: string, maker: string): ModelIdentity => {
  const representative = listing(id, name, maker);
  return { key: id, maker, representative, listings: [representative] };
};

const gpt = identity("gpt-4o", "GPT-4o", "openai");
const sonnet = identity("claude-sonnet-4-5", "Claude Sonnet 4.5", "anthropic");
const grok = identity("grok-4", "Grok 4", "xai");

const arenaSet: BenchmarkSet = {
  source: "LMArena",
  measuredAt: "2026-08-27",
  scores: [
    {
      modelId: "gpt-4o",
      metrics: { overall: { value: 1500, low: 1495, high: 1505, votes: 25_824 } },
    },
    {
      modelId: "claude-sonnet-4-5",
      metrics: {
        overall: { value: 1460, low: 1450, high: 1470, votes: 12_000 },
        coding: { value: 1480, low: 1476, high: 1484, votes: 8_000 },
      },
    },
  ],
};

test("rateIdentities attaches ratings to matched identities and leaves the rest bare", () => {
  const rated = rateIdentities([gpt, sonnet, grok], arenaSet);
  expect(rated).toHaveLength(3);
  const byKey = new Map(rated.map((entry) => [entry.key, entry]));
  expect(byKey.get("gpt-4o")?.ratings?.overall.best).toBe(1500);
  expect(byKey.get("claude-sonnet-4-5")?.ratings?.coding.best).toBe(1480);
  expect(byKey.get("grok-4")?.ratings).toBeUndefined();
});

test("rateIdentities with no set returns the identities untouched", () => {
  expect(rateIdentities([gpt, grok], null)).toEqual([gpt, grok]);
});
const metricSet = (...names: string[]): BenchmarkSet => ({
  source: "test",
  measuredAt: "2026-08-27",
  scores: [
    {
      modelId: "gpt-4o",
      metrics: Object.fromEntries(names.map((name) => [name, { value: 1 }])),
    },
  ],
});

test("metricList orders known metrics first in fixed order, unknown names after alphabetically", () => {
  const set = metricSet("math", "zeta_bench", "overall", "if_score", "coding");
  expect(metricList(set).map(({ name }) => name)).toEqual([
    "overall",
    "coding",
    "math",
    "if_score",
    "zeta_bench",
  ]);
});

test("metricList labels known names and humanizes unknown ones", () => {
  const set = metricSet("hard_prompts", "intelligence_index", "tau_banking");
  expect(metricList(set)).toEqual([
    { name: "hard_prompts", label: "Hard prompts" },
    { name: "intelligence_index", label: "Intelligence" },
    { name: "tau_banking", label: "Tau banking" },
  ]);
});

test("metricList is empty with no set", () => {
  expect(metricList(null)).toEqual([]);
});

test("keepMetrics trims every score to the named metrics and drops scores left empty", () => {
  const set = metricSet("overall", "exclude_ties", "coding");
  const trimmed = keepMetrics(set, ["overall", "coding"]);
  expect(trimmed.scores).toHaveLength(1);
  expect(Object.keys(trimmed.scores[0].metrics)).toEqual(["overall", "coding"]);
  expect(trimmed.source).toBe("test");
  const emptied = keepMetrics(metricSet("exclude_ties"), ["overall"]);
  expect(emptied.scores).toEqual([]);
});

test("defaultWeights puts weight 1 on the first listed metric and 0 on the rest", () => {
  expect(defaultWeights(metricSet("coding", "overall"))).toEqual({ overall: 1, coding: 0 });
  expect(defaultWeights(null)).toEqual({});
});
test("stepWeight clamps at 0 and at 5", () => {
  expect(stepWeight({ overall: 1, coding: 2 }, "coding", 1)).toEqual({ overall: 1, coding: 3 });
  expect(stepWeight({ overall: 1, coding: 5 }, "coding", 1)).toEqual({ overall: 1, coding: 5 });
  expect(stepWeight({ overall: 1, coding: 2 }, "coding", -1)).toEqual({ overall: 1, coding: 1 });
  expect(stepWeight({ overall: 1, coding: 0 }, "coding", -1)).toEqual({ overall: 1, coding: 0 });
});

test("stepWeight refuses to zero the last positive weight", () => {
  expect(stepWeight({ overall: 1, coding: 0 }, "overall", -1)).toEqual({ overall: 1, coding: 0 });
  expect(stepWeight({ overall: 2, coding: 0 }, "overall", -1)).toEqual({ overall: 1, coding: 0 });
});

test("blendSummary always speaks the mix, a lone positive metric included", () => {
  expect(blendSummary({ overall: 1, coding: 1, math: 0 })).toBe("= 50% Overall + 50% Coding");
  expect(blendSummary({ overall: 2, coding: 1, math: 1 })).toBe(
    "= 50% Overall + 25% Coding + 25% Math",
  );
  expect(blendSummary({ overall: 1, coding: 0 })).toBe("= 100% Overall");
  expect(blendSummary({})).toBeNull();
});
const rated = rateIdentities([grok, sonnet, gpt], arenaSet);

test("scoreBoard orders rated rows by blended value descending, unrated after by name", () => {
  const board = scoreBoard(rated, { overall: 1 });
  expect(board.rows.map(({ key }) => key)).toEqual(["gpt-4o", "claude-sonnet-4-5", "grok-4"]);
  expect(board.rows.map(({ score }) => score.kind)).toEqual(["rated", "rated", "unrated"]);
  expect(board.unratedCount).toBe(1);
});

test("scoreBoard's band scale spans the lowest low to the highest high among rated rows", () => {
  const board = scoreBoard(rated, { overall: 1 });
  expect(board.scale).toEqual({ min: 1450, max: 1505 });
  expect(scoreBoard([grok], { overall: 1 }).scale).toBeNull();
});

test("a single-metric score carries its votes note", () => {
  const [top] = scoreBoard(rated, { overall: 1 }).rows;
  expect(top.score).toEqual({
    kind: "rated",
    value: 1500,
    low: 1495,
    high: 1505,
    note: "25,824 votes",
    configNote: null,
  });
});

test("a single-metric score with rival configs carries the config note", () => {
  const rivals: BenchmarkSet = {
    source: "LMArena",
    measuredAt: "2026-08-27",
    scores: [
      { modelId: "gpt-4o", metrics: { overall: { value: 1500, low: 1495, high: 1505 } } },
      {
        modelId: "gpt-4o-high",
        metrics: { overall: { value: 1510, low: 1504, high: 1516, votes: 9_000 } },
      },
    ],
  };
  const [top] = scoreBoard(rateIdentities([gpt], rivals), { overall: 1 }).rows;
  expect(top.score).toEqual({
    kind: "rated",
    value: 1510,
    low: 1504,
    high: 1516,
    note: "9,000 votes",
    configNote: "2 configs, 1500-1510 (best: gpt-4o-high)",
  });
});

test("rival configs with identical ratings carry no config note", () => {
  const twins: BenchmarkSet = {
    source: "test",
    measuredAt: "2026-09-01",
    scores: [
      { modelId: "gpt-4o", metrics: { overall: { value: 62 } } },
      { modelId: "gpt-4o-high", metrics: { overall: { value: 62 } } },
    ],
  };
  const [top] = scoreBoard(rateIdentities([gpt], twins), { overall: 1 }).rows;
  expect(top.score.kind === "rated" && top.score.configNote).toBeNull();
});

test("a blend missing some weighted metrics notes the shortfall and drops votes", () => {
  const board = scoreBoard(rated, { overall: 1, coding: 1 });
  const gptRow = board.rows.find(({ key }) => key === "gpt-4o");
  expect(gptRow?.score).toEqual({
    kind: "rated",
    value: 1500,
    low: 1495,
    high: 1505,
    note: "1/2 weighted metrics",
    configNote: null,
  });
});

test("a complete blend carries no note and rounds its value", () => {
  const board = scoreBoard(rated, { overall: 1, coding: 2 });
  const sonnetRow = board.rows.find(({ key }) => key === "claude-sonnet-4-5");
  // By hand: (1460 + 2 * 1480) / 3 = 1473.33 rounds to 1473.
  // Band: (1450 + 2 * 1476) / 3 = 1467.33 and (1470 + 2 * 1484) / 3 = 1479.33.
  expect(sonnetRow?.score).toEqual({
    kind: "rated",
    value: 1473,
    low: 1467.3333333333333,
    high: 1479.3333333333333,
    note: null,
    configNote: null,
  });
});
