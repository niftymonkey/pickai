import { describe, it, expect } from "vitest";
import { withDisplayLabels } from "./with-display-labels";
import { createModel, fixtures } from "./test-utils";

describe("withDisplayLabels", () => {
  it("adds formatted provider name", () => {
    expect(withDisplayLabels(fixtures.opus).providerName).toBe("Anthropic");
    expect(withDisplayLabels(fixtures.gpt4o).providerName).toBe("OpenAI");
    expect(withDisplayLabels(fixtures.flash).providerName).toBe("Google");
  });

  it("adds formatted price label", () => {
    expect(withDisplayLabels(fixtures.sonnet).priceLabel).toBe("$3/$15 per 1M");
  });

  it("sets priceLabel to Free for zero pricing", () => {
    const free = createModel({ pricing: { input: 0, output: 0 } });
    expect(withDisplayLabels(free).priceLabel).toBe("Free");
  });

  it("sets priceLabel to empty string when pricing is undefined", () => {
    const noPricing = createModel({ pricing: undefined });
    expect(withDisplayLabels(noPricing).priceLabel).toBe("");
  });

  it("adds formatted context label", () => {
    expect(withDisplayLabels(fixtures.gpt4o).contextLabel).toBe("128K");
    expect(withDisplayLabels(fixtures.flash).contextLabel).toBe("1.0M");
  });

  it("sets contextLabel to empty string when contextWindow is undefined", () => {
    const noCtx = createModel({ contextWindow: undefined });
    expect(withDisplayLabels(noCtx).contextLabel).toBe("");
  });

  it("preserves all original Model fields", () => {
    const result = withDisplayLabels(fixtures.sonnet);
    expect(result.id).toBe(fixtures.sonnet.id);
    expect(result.apiSlugs).toEqual(fixtures.sonnet.apiSlugs);
    expect(result.name).toBe(fixtures.sonnet.name);
  });

  it("composes with .map()", () => {
    const labeled = [fixtures.opus, fixtures.gpt4o].map(withDisplayLabels);
    expect(labeled[0].providerName).toBe("Anthropic");
    expect(labeled[1].providerName).toBe("OpenAI");
  });
});
