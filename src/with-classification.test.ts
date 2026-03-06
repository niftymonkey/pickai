import { describe, it, expect } from "vitest";
import { withClassification } from "./with-classification";
import { Tier, Cost } from "./types";
import { createModel, fixtures } from "./test-utils";

describe("withClassification", () => {
  it("adds tier classification", () => {
    expect(withClassification(fixtures.opus).tier).toBe(Tier.Flagship);
    expect(withClassification(fixtures.sonnet).tier).toBe(Tier.Standard);
    expect(withClassification(fixtures.haiku).tier).toBe(Tier.Efficient);
  });

  it("adds cost tier classification", () => {
    expect(withClassification(fixtures.opus).costTier).toBe(Cost.Premium);
    expect(withClassification(fixtures.sonnet).costTier).toBe(Cost.Standard);
    expect(withClassification(fixtures.gpt4oMini).costTier).toBe(Cost.Budget);
  });

  it("preserves all original Model fields", () => {
    const result = withClassification(fixtures.sonnet);
    expect(result.id).toBe(fixtures.sonnet.id);
    expect(result.apiSlugs).toEqual(fixtures.sonnet.apiSlugs);
    expect(result.name).toBe(fixtures.sonnet.name);
    expect(result.provider).toBe(fixtures.sonnet.provider);
  });

  it("composes with .map()", () => {
    const classified = [fixtures.haiku, fixtures.sonnet, fixtures.opus].map(withClassification);
    expect(classified.map((m) => m.tier)).toEqual([
      Tier.Efficient,
      Tier.Standard,
      Tier.Flagship,
    ]);
  });

  it("free model gets Cost.Free", () => {
    const free = createModel({ pricing: { input: 0, output: 0 } });
    expect(withClassification(free).costTier).toBe(Cost.Free);
  });
});
