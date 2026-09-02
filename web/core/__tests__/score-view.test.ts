import { expect, test } from "vitest";
import type { BenchmarkSet, Model, ModelIdentity } from "pickai";
import {
  bandSpan,
  blendSentence,
  resultsSummary,
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

test("the blend speaks its mix as a sentence, and the shares total 100", () => {
  // A percentage of one thing reads as a score, so a lone metric is named, not measured.
  expect(blendSentence({ overall: 1, coding: 0 })).toBe("Every score is the Overall rating.");
  expect(blendSentence({ overall: 1, coding: 1, math: 0 })).toBe(
    "Every score is 50% Overall and 50% Coding.",
  );
  // Thirds round to 33 each; the last share absorbs the remainder so they still make 100.
  expect(blendSentence({ overall: 1, coding: 1, math: 1 })).toBe(
    "Every score is 33% Overall, 33% Coding and 34% Math.",
  );
  expect(blendSentence({})).toBeNull();
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

test("the top score's band stays inside the track when its interval is a point", () => {
  // Artificial Analysis publishes point scores, so the best model's low equals the
  // scale's max. An unclamped left of 100% left the winner with a zero-width band.
  const span = bandSpan({ low: 63, high: 63 }, { min: 20, max: 63 });
  expect(span).toEqual({ left: 97, width: 3 });
});

test("a band sits where its interval sits on the shared scale", () => {
  // Half way up a 0-100 scale, spanning a tenth of it.
  expect(bandSpan({ low: 45, high: 55 }, { min: 0, max: 100 })).toEqual({ left: 45, width: 10 });
});

test("a scale with no span fills the track", () => {
  // One rated survivor: there is no spread to place it against.
  expect(bandSpan({ low: 1400, high: 1400 }, { min: 1400, max: 1400 })).toEqual({
    left: 0,
    width: 100,
  });
});

const plain = { emptiedBy: null, searching: false };

test("the results line counts the rows it holds", () => {
  const board = scoreBoard(rated, { overall: 1 });
  expect(resultsSummary(board.rows.slice(0, 2), plain)).toBe("2 models");
  expect(resultsSummary(board.rows.slice(0, 1), plain)).toBe("1 model");
});

test("the results line names the unrated bucket when there is one", () => {
  // The fixture set rates two of the three, so one row lands in the unrated bucket.
  const board = scoreBoard(rated, { overall: 1 });
  expect(resultsSummary(board.rows, plain)).toBe("3 models, 1 unrated");
});

test("the results line speaks the rule that emptied the board", () => {
  expect(
    resultsSummary([], { emptiedBy: { label: "Input price at most $5/M", cutModels: 1276 }, searching: false }),
  ).toBe("No models pass your rules. Input price at most $5/M cut the most, 1,276 models.");
});

test("the results line stays plain when nothing is left and no rule stands out", () => {
  expect(resultsSummary([], plain)).toBe("No models pass your rules.");
});

test("a search that matches nothing blames the search, not the rules", () => {
  // The rules are fine; this query simply matches none of the rows they left.
  expect(resultsSummary([], { emptiedBy: null, searching: true })).toBe(
    "No match among the models that pass your rules.",
  );
  const board = scoreBoard(rated, { overall: 1 });
  expect(resultsSummary(board.rows.slice(0, 1), { emptiedBy: null, searching: true })).toBe(
    "1 match",
  );
});
