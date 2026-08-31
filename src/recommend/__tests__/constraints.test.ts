import { describe, it, expect } from "vitest";
import { perMaker, perFamily } from "../constraints";

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

/** An identity as groupByModel would build it. */
const identity = (key: string, maker: string | null, extra: Record<string, unknown> = {}) => ({
  key,
  maker,
  representative: listing(key, maker ?? "unknown-seller", extra),
  listings: [listing(key, maker ?? "unknown-seller", extra)],
});

describe("perMaker", () => {
  it("rejects a second model from the same maker at the default limit", () => {
    const constraint = perMaker();
    const opus = identity("opus", "anthropic");
    const sonnet = identity("sonnet", "anthropic");
    expect(constraint([], opus)).toBe(true);
    expect(constraint([opus], sonnet)).toBe(false);
  });

  it("allows up to the given limit and rejects the next", () => {
    const constraint = perMaker(2);
    const opus = identity("opus", "anthropic");
    const sonnet = identity("sonnet", "anthropic");
    const haiku = identity("haiku", "anthropic");
    expect(constraint([opus], sonnet)).toBe(true);
    expect(constraint([opus, sonnet], haiku)).toBe(false);
  });

  it("a model with an unknown maker is never counted and always passes", () => {
    const constraint = perMaker(1);
    const mystery = identity("mystery-72b", null);
    const enigma = identity("enigma-8b", null);
    expect(constraint([mystery], enigma)).toBe(true);
  });
});

describe("perFamily", () => {
  it("rejects a second model from the same family at the default limit", () => {
    const constraint = perFamily();
    const opus = identity("opus", "anthropic", { family: "claude" });
    const sonnet = identity("sonnet", "anthropic", { family: "claude" });
    expect(constraint([], opus)).toBe(true);
    expect(constraint([opus], sonnet)).toBe(false);
  });

  it("a model without a family always passes", () => {
    const constraint = perFamily();
    const opus = identity("opus", "anthropic", { family: "claude" });
    const stray = identity("stray-7b", null);
    expect(constraint([opus], stray)).toBe(true);
  });
});
