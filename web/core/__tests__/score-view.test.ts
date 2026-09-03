import { expect, test } from "vitest";
import type { BenchmarkSet, Model, ModelIdentity } from "pickai";
import {
  fillPercent,
  sharedScale,
  metricRanks,
  blendSentence,
  catalogReceipt,
  decisionSentence,
  deltaNote,
  resultsSummary,
  defaultWeights,
  keepMetrics,
  metricList,
  rateIdentities,
  scoreBoard,
  stepWeight,
} from "../score-view";
import type { ScorableIdentity } from "../score-view";

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

// A rated identity built straight from best values, for the scale and rank maths.
const ratedIdentity = (id: string, bests: Record<string, number>): ScorableIdentity => ({
  ...identity(id, id, "maker"),
  ratings: Object.fromEntries(
    Object.entries(bests).map(([name, best]) => [
      name,
      { best, bestConfig: id, low: best, high: best, min: best, max: best, configs: 1 },
    ]),
  ),
});

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

test("the blend sentence says intent, and never a percentage", () => {
  // Percentages describe the arithmetic and never say what matters, so the sentence
  // is a ladder read against the biggest weight. These are the acceptance cases.
  expect(blendSentence({ overall: 1, coding: 0 })).toBe("Ordered by Overall rating.");
  expect(blendSentence({ coding: 2, intelligence_index: 1 })).toBe(
    "Ordered by Coding above all, with some Intelligence.",
  );
  // A leader at half or more stands above everything, however close the runner-up sits,
  // so 2-to-1 and 5-to-1 read the same. Known and accepted.
  expect(blendSentence({ coding: 5, intelligence_index: 1 })).toBe(
    "Ordered by Coding above all, with some Intelligence.",
  );
  expect(blendSentence({ coding: 3, math: 3 })).toBe("Ordered by Coding and Math equally.");
  expect(
    blendSentence({ coding: 4, instruction_following: 3, agentic_index: 2, intelligence_index: 1 }),
  ).toBe(
    "Ordered by Coding first, then Instruction following, then Agentic, with some Intelligence.",
  );
  expect(blendSentence({ coding: 5, math: 1, creative_writing: 1 })).toBe(
    "Ordered by Coding above all, with some Math and Creative writing.",
  );
  expect(blendSentence({})).toBeNull();
});

test("the catalog receipt states the data, not the rules", () => {
  expect(catalogReceipt({ listings: 7495, models: 1711, scored: 398 })).toBe(
    "7,495 listings \u2192 1,711 models \u00b7 398 scored \u00b7 1,313 unscored",
  );
});

test("the decision line counts nothing until a rule has cut something", () => {
  // At first paint a count of the whole catalog is the census printed twice.
  expect(decisionSentence({ survivors: 1711, total: 1711, ruleCount: 0, weights: { overall: 1 } })).toBe(
    "Ordered by Overall rating.",
  );
  expect(
    decisionSentence({
      survivors: 425,
      total: 1721,
      ruleCount: 3,
      weights: { coding: 3, instruction_following: 2 },
    }),
  ).toBe(
    "425 of 1,721 models pass your 3 rules, ordered by Coding above all, with some Instruction following.",
  );
  expect(decisionSentence({ survivors: 40, total: 1711, ruleCount: 1, weights: { overall: 1 } })).toBe(
    "40 of 1,711 models pass your 1 rule, ordered by Overall rating.",
  );
});

const top = (...names: string[]) => names.map((name) => ({ key: name, name }));

test("the change note says what the last move did to the top of the board", () => {
  // A rule that cuts thousands and leaves the top untouched has taught you something.
  expect(
    deltaNote({ kind: "rule", words: "Only anthropic", on: true }, ["a", "b"], top("a", "b")),
  ).toEqual({
    lead: "Only anthropic: same top 10.",
    quiet: "Everything at the top already qualified.",
  });
  expect(
    deltaNote({ kind: "rule", words: "Only meta", on: true }, ["a", "b"], top("x", "y", "b")),
  ).toEqual({ lead: "Only meta replaced 2 of the top 10.", quiet: "Brought in x and y." });
  expect(
    deltaNote({ kind: "rule", words: "Only meta", on: false }, ["a"], top("a", "b")),
  ).toEqual({ lead: "Only meta removed.", quiet: null });
  expect(deltaNote({ kind: "weight", label: "Coding" }, ["a", "b"], top("a", "b"))).toEqual({
    lead: "Weighting changed.",
    quiet: "Same top 10.",
  });
  expect(deltaNote({ kind: "weight", label: "Coding" }, ["a"], top("z", "a"))).toEqual({
    lead: "Coding now carries the order.",
    quiet: "It moved 1 of the top 10.",
  });
  expect(
    deltaNote({ kind: "source", label: "Artificial Analysis", rated: 341 }, [], []),
  ).toEqual({
    lead: "Now ordering by Artificial Analysis.",
    quiet: "341 models carry a score there.",
  });
});

test("the change note names three arrivals and counts the rest", () => {
  expect(
    deltaNote(
      { kind: "rule", words: "Cheap", on: true },
      [],
      top("a", "b", "c", "d", "e"),
    ).quiet,
  ).toBe("Brought in a, b, c and 2 more.");
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

test("a bar's length is where its value sits on the shared scale", () => {
  // Half way up a 0-100 scale.
  expect(fillPercent(50, { min: 0, max: 100 })).toBe(50);
});

test("a bar keeps a sliver of length at the bottom of the scale", () => {
  // The lowest measured model still has to be visible as a bar.
  expect(fillPercent(0, { min: 0, max: 100 })).toBe(1.5);
});

test("a scale with no span fills the bar", () => {
  // One rated survivor: there is no spread to place it against.
  expect(fillPercent(1400, { min: 1400, max: 1400 })).toBe(100);
});

test("one scale spans every metric of every rated model", () => {
  // Per-metric scales made lengths look comparable down a panel when they were
  // not: a lower math score drew a longer bar than a higher coding one.
  const scale = sharedScale([
    ratedIdentity("a", { overall: 1400, coding: 1500 }),
    ratedIdentity("b", { overall: 1200, math: 1450 }),
  ]);
  expect(scale).toEqual({ min: 1200, max: 1500 });
});

test("a catalog with no ratings has no scale", () => {
  expect(sharedScale([])).toBeNull();
});

test("a model's place is its rank among the models measured in that category", () => {
  const ranks = metricRanks([
    ratedIdentity("a", { coding: 1500 }),
    ratedIdentity("b", { coding: 1400 }),
    ratedIdentity("c", { coding: 1600 }),
  ]);
  expect(ranks.coding.places).toEqual({ c: 1, a: 2, b: 3 });
  expect(ranks.coding.measured).toBe(3);
});

test("tied scores share the better place", () => {
  const ranks = metricRanks([
    ratedIdentity("a", { coding: 1500 }),
    ratedIdentity("b", { coding: 1500 }),
    ratedIdentity("c", { coding: 1400 }),
  ]);
  expect(ranks.coding.places).toEqual({ a: 1, b: 1, c: 3 });
});

test("each category counts only the models the source measured in it", () => {
  // A source does not rate every model in every category, so the denominator is
  // per metric: "#4 of 165" beside "#2 of 169" is the honest pair.
  const ranks = metricRanks([
    ratedIdentity("a", { overall: 1500, math: 1500 }),
    ratedIdentity("b", { overall: 1400 }),
  ]);
  expect(ranks.overall.measured).toBe(2);
  expect(ranks.math.measured).toBe(1);
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
  // "match" plus an s is "matchs", so the plural is given rather than derived.
  expect(resultsSummary(board.rows.slice(0, 2), { emptiedBy: null, searching: true })).toBe(
    "2 matches",
  );
});
