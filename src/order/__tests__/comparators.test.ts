import { describe, it, expect } from "vitest";
import {
  sortByCost,
  sortByOutputCost,
  sortByContext,
  sortByOutput,
  sortByRecency,
  sortByKnowledgeCutoff,
  sortByProvider,
  sortByOpenWeights,
  sortByMetric,
} from "../comparators";

/** A listing as the catalog carries it, shaped by hand to keep the test fence honest. */
const listing = (id: string, provider: string, extra: Record<string, unknown> = {}) => ({
  id,
  name: id,
  provider,
  limit: { context: 200000, output: 8192 },
  modalities: { input: ["text"], output: ["text"] },
  openRouterId: `${provider}/${id}`,
  ...extra,
});

type Listing = ReturnType<typeof listing>;

/** An identity as groupByModel would build it, with optional joined metrics. */
const identity = (
  key: string,
  maker: string | null,
  representative: Listing,
  metrics?: Record<string, number>,
) => ({ key, maker, representative, listings: [representative], metrics });

describe("sortByCost", () => {
  it("orders the cheapest known input rate first by default", () => {
    const pricey = identity("opus", "anthropic", listing("opus", "anthropic", { cost: { input: 15, output: 75 } }));
    const cheap = identity("mini", "openai", listing("mini", "openai", { cost: { input: 0.15, output: 0.6 } }));
    const mid = identity("sonnet", "anthropic", listing("sonnet", "anthropic", { cost: { input: 3, output: 15 } }));
    const sorted = [pricey, cheap, mid].sort(sortByCost());
    expect(sorted.map((m) => m.key)).toEqual(["mini", "sonnet", "opus"]);
  });
  it("desc puts the priciest known input rate first", () => {
    const pricey = identity("opus", "anthropic", listing("opus", "anthropic", { cost: { input: 15, output: 75 } }));
    const cheap = identity("mini", "openai", listing("mini", "openai", { cost: { input: 0.15, output: 0.6 } }));
    const sorted = [cheap, pricey].sort(sortByCost("desc"));
    expect(sorted.map((m) => m.key)).toEqual(["opus", "mini"]);
  });
  it("a model with unknown input rate sorts last in both directions", () => {
    const unknown = identity("mystery", "acme", listing("mystery", "acme"));
    const cheap = identity("mini", "openai", listing("mini", "openai", { cost: { input: 0.15, output: 0.6 } }));
    const pricey = identity("opus", "anthropic", listing("opus", "anthropic", { cost: { input: 15, output: 75 } }));
    expect([unknown, cheap, pricey].sort(sortByCost()).map((m) => m.key)).toEqual(["mini", "opus", "mystery"]);
    expect([unknown, cheap, pricey].sort(sortByCost("desc")).map((m) => m.key)).toEqual(["opus", "mini", "mystery"]);
  });
});

describe("sortByOutputCost", () => {
  it("orders the cheapest known output rate first by default", () => {
    const pricey = identity("opus", "anthropic", listing("opus", "anthropic", { cost: { input: 15, output: 75 } }));
    const cheap = identity("mini", "openai", listing("mini", "openai", { cost: { input: 0.15, output: 0.6 } }));
    const sorted = [pricey, cheap].sort(sortByOutputCost());
    expect(sorted.map((m) => m.key)).toEqual(["mini", "opus"]);
  });
  it("a model with unknown output rate sorts last in both directions", () => {
    const unknown = identity("mystery", "acme", listing("mystery", "acme"));
    const cheap = identity("mini", "openai", listing("mini", "openai", { cost: { input: 0.15, output: 0.6 } }));
    expect([unknown, cheap].sort(sortByOutputCost()).map((m) => m.key)).toEqual(["mini", "mystery"]);
    expect([unknown, cheap].sort(sortByOutputCost("desc")).map((m) => m.key)).toEqual(["mini", "mystery"]);
  });
});

describe("sortByContext", () => {
  it("puts the biggest context window first by default", () => {
    const small = identity("mini", "openai", listing("mini", "openai", { limit: { context: 128000, output: 16384 } }));
    const big = identity("gemini", "google", listing("gemini", "google", { limit: { context: 1000000, output: 65536 } }));
    expect([small, big].sort(sortByContext()).map((m) => m.key)).toEqual(["gemini", "mini"]);
  });
  it("asc puts the smallest known context first", () => {
    const small = identity("mini", "openai", listing("mini", "openai", { limit: { context: 128000, output: 16384 } }));
    const big = identity("gemini", "google", listing("gemini", "google", { limit: { context: 1000000, output: 65536 } }));
    expect([big, small].sort(sortByContext("asc")).map((m) => m.key)).toEqual(["mini", "gemini"]);
  });
  it("a zero context sorts as unknown, last in both directions", () => {
    const unknown = identity("mystery", "acme", listing("mystery", "acme", { limit: { context: 0, output: 4096 } }));
    const small = identity("mini", "openai", listing("mini", "openai", { limit: { context: 128000, output: 16384 } }));
    expect([unknown, small].sort(sortByContext()).map((m) => m.key)).toEqual(["mini", "mystery"]);
    expect([unknown, small].sort(sortByContext("asc")).map((m) => m.key)).toEqual(["mini", "mystery"]);
  });
});

describe("sortByOutput", () => {
  it("puts the biggest max output first by default", () => {
    const small = identity("mini", "openai", listing("mini", "openai", { limit: { context: 128000, output: 16384 } }));
    const big = identity("gemini", "google", listing("gemini", "google", { limit: { context: 1000000, output: 65536 } }));
    expect([small, big].sort(sortByOutput()).map((m) => m.key)).toEqual(["gemini", "mini"]);
  });
  it("a zero max output sorts as unknown, last in both directions", () => {
    const unknown = identity("mystery", "acme", listing("mystery", "acme", { limit: { context: 4096, output: 0 } }));
    const small = identity("mini", "openai", listing("mini", "openai", { limit: { context: 128000, output: 16384 } }));
    expect([unknown, small].sort(sortByOutput()).map((m) => m.key)).toEqual(["mini", "mystery"]);
    expect([unknown, small].sort(sortByOutput("asc")).map((m) => m.key)).toEqual(["mini", "mystery"]);
  });
});

describe("sortByRecency", () => {
  it("puts the newest release first by default", () => {
    const older = identity("davinci", "openai", listing("davinci", "openai", { releaseDate: "2023-11-06" }));
    const newer = identity("opus", "anthropic", listing("opus", "anthropic", { releaseDate: "2025-09-29" }));
    expect([older, newer].sort(sortByRecency()).map((m) => m.key)).toEqual(["opus", "davinci"]);
  });
  it("a missing or malformed release date sorts last in both directions", () => {
    const missing = identity("mystery", "acme", listing("mystery", "acme"));
    const malformed = identity("weird", "acme", listing("weird", "acme", { releaseDate: "soon" }));
    const dated = identity("opus", "anthropic", listing("opus", "anthropic", { releaseDate: "2025-09-29" }));
    expect([missing, malformed, dated].sort(sortByRecency()).map((m) => m.key)).toEqual(["opus", "mystery", "weird"]);
    expect([missing, malformed, dated].sort(sortByRecency("asc")).map((m) => m.key)).toEqual(["opus", "mystery", "weird"]);
  });
});

describe("sortByKnowledgeCutoff", () => {
  it("puts the newest knowledge cutoff first by default", () => {
    const older = identity("davinci", "openai", listing("davinci", "openai", { knowledge: "2021-09" }));
    const newer = identity("opus", "anthropic", listing("opus", "anthropic", { knowledge: "2025-03" }));
    expect([older, newer].sort(sortByKnowledgeCutoff()).map((m) => m.key)).toEqual(["opus", "davinci"]);
  });
  it("a model without a cutoff sorts last in both directions", () => {
    const missing = identity("mystery", "acme", listing("mystery", "acme"));
    const dated = identity("opus", "anthropic", listing("opus", "anthropic", { knowledge: "2025-03" }));
    expect([missing, dated].sort(sortByKnowledgeCutoff()).map((m) => m.key)).toEqual(["opus", "mystery"]);
    expect([missing, dated].sort(sortByKnowledgeCutoff("asc")).map((m) => m.key)).toEqual(["opus", "mystery"]);
  });
});

describe("sortByProvider", () => {
  it("orders makers A to Z by default", () => {
    const openai = identity("mini", "openai", listing("mini", "openai"));
    const anthropic = identity("opus", "anthropic", listing("opus", "anthropic"));
    const google = identity("gemini", "google", listing("gemini", "google"));
    expect([openai, anthropic, google].sort(sortByProvider()).map((m) => m.maker)).toEqual([
      "anthropic",
      "google",
      "openai",
    ]);
  });
  it("an unknown maker sorts last in both directions", () => {
    const unknown = identity("mystery", null, listing("mystery", "acme"));
    const anthropic = identity("opus", "anthropic", listing("opus", "anthropic"));
    expect([unknown, anthropic].sort(sortByProvider()).map((m) => m.key)).toEqual(["opus", "mystery"]);
    expect([unknown, anthropic].sort(sortByProvider("desc")).map((m) => m.key)).toEqual(["opus", "mystery"]);
  });
});

describe("sortByOpenWeights", () => {
  it("puts open-weights models before closed ones by default", () => {
    const closed = identity("opus", "anthropic", listing("opus", "anthropic", { openWeights: false }));
    const open = identity("llama", "meta", listing("llama", "meta", { openWeights: true }));
    expect([closed, open].sort(sortByOpenWeights()).map((m) => m.key)).toEqual(["llama", "opus"]);
  });
  it("an unknown open-weights fact sorts last in both directions, after closed", () => {
    const unknown = identity("mystery", "acme", listing("mystery", "acme"));
    const closed = identity("opus", "anthropic", listing("opus", "anthropic", { openWeights: false }));
    const open = identity("llama", "meta", listing("llama", "meta", { openWeights: true }));
    expect([unknown, closed, open].sort(sortByOpenWeights()).map((m) => m.key)).toEqual(["llama", "opus", "mystery"]);
    expect([unknown, closed, open].sort(sortByOpenWeights("asc")).map((m) => m.key)).toEqual(["opus", "llama", "mystery"]);
  });
});

describe("sortByMetric", () => {
  it("orders by the named metric, best first by default", () => {
    const lower = identity("mini", "openai", listing("mini", "openai"), { overall: 1401 });
    const higher = identity("opus", "anthropic", listing("opus", "anthropic"), { overall: 1468 });
    expect([lower, higher].sort(sortByMetric("overall")).map((m) => m.key)).toEqual(["opus", "mini"]);
  });
  it("asc puts the worst-rated first", () => {
    const lower = identity("mini", "openai", listing("mini", "openai"), { overall: 1401 });
    const higher = identity("opus", "anthropic", listing("opus", "anthropic"), { overall: 1468 });
    expect([higher, lower].sort(sortByMetric("overall", "asc")).map((m) => m.key)).toEqual(["mini", "opus"]);
  });
  it("is name-blind: any metric name present in the data works", () => {
    const lower = identity("mini", "openai", listing("mini", "openai"), { tau_banking: 0.41 });
    const higher = identity("opus", "anthropic", listing("opus", "anthropic"), { tau_banking: 0.62 });
    expect([lower, higher].sort(sortByMetric("tau_banking")).map((m) => m.key)).toEqual(["opus", "mini"]);
  });
  it("a model without the named metric sorts last in both directions", () => {
    const unrated = identity("mystery", "acme", listing("mystery", "acme"));
    const partial = identity("mini", "openai", listing("mini", "openai"), { coding: 1400 });
    const rated = identity("opus", "anthropic", listing("opus", "anthropic"), { overall: 1468 });
    expect([unrated, partial, rated].sort(sortByMetric("overall")).map((m) => m.key)).toEqual([
      "opus",
      "mystery",
      "mini",
    ]);
    expect([unrated, rated].sort(sortByMetric("overall", "asc")).map((m) => m.key)).toEqual(["opus", "mystery"]);
  });
});

describe("ties", () => {
  // Tie-break policy (score then name, per the sorting spec) belongs to the consumer, not the axis.
  it("equal values compare as ties, so tie-breaks stay the caller's choice", () => {
    const a = identity("opus", "anthropic", listing("opus", "anthropic", { cost: { input: 3, output: 15 } }));
    const b = identity("sonnet", "anthropic", listing("sonnet", "anthropic", { cost: { input: 3, output: 15 } }));
    expect(sortByCost()(a, b)).toBe(0);
    expect(sortByProvider()(a, b)).toBe(0);
    expect(sortByMetric("overall")(a, b)).toBe(0);
  });
});
