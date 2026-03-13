import { describe, it, expect } from "vitest";
import { perProvider, perFamily } from "./constraints";
import { fixtures } from "./test-utils";
import type { Model } from "./types";

describe("perProvider", () => {
  it("allows first model from any provider", () => {
    const constraint = perProvider();
    expect(constraint([], fixtures.opus)).toBe(true);
  });

  it("blocks second model from same provider (default max 1)", () => {
    const constraint = perProvider();
    const selected: Model[] = [fixtures.opus]; // anthropic
    expect(constraint(selected, fixtures.sonnet)).toBe(false); // also anthropic
  });

  it("allows model from different provider", () => {
    const constraint = perProvider();
    const selected: Model[] = [fixtures.opus]; // anthropic
    expect(constraint(selected, fixtures.gpt52)).toBe(true); // openai
  });

  it("respects custom max", () => {
    const constraint = perProvider(2);
    const selected: Model[] = [fixtures.opus]; // anthropic
    expect(constraint(selected, fixtures.sonnet)).toBe(true); // 2nd anthropic OK
    const selected2: Model[] = [fixtures.opus, fixtures.sonnet]; // 2 anthropic
    expect(constraint(selected2, fixtures.haiku)).toBe(false); // 3rd blocked
  });
});

describe("perFamily", () => {
  it("allows first model from any family", () => {
    const constraint = perFamily();
    expect(constraint([], fixtures.opus)).toBe(true);
  });

  it("blocks second model from same family (default max 1)", () => {
    const constraint = perFamily();
    const selected: Model[] = [fixtures.opus]; // claude family
    expect(constraint(selected, fixtures.sonnet)).toBe(false); // also claude
  });

  it("allows model from different family", () => {
    const constraint = perFamily();
    const selected: Model[] = [fixtures.opus]; // claude family
    expect(constraint(selected, fixtures.gpt52)).toBe(true); // gpt family
  });

  it("models without family always pass", () => {
    const constraint = perFamily();
    const noFamily: Model = { ...fixtures.opus, family: undefined };
    const selected: Model[] = [fixtures.opus];
    expect(constraint(selected, noFamily)).toBe(true);
  });

  it("respects custom max", () => {
    const constraint = perFamily(2);
    const selected: Model[] = [fixtures.opus, fixtures.sonnet]; // 2 claude
    expect(constraint(selected, fixtures.haiku)).toBe(false); // 3rd blocked
  });
});
