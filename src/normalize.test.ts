import { describe, it, expect } from "vitest";
import { normalizeOpenWeights } from "./normalize";
import { createModel } from "./test-utils";

describe("normalizeOpenWeights", () => {
  it("spreads openWeights true to all entries of the same model", () => {
    const hf = createModel({ id: "glm-5-3-flash", provider: "huggingface", openWeights: true });
    const zai = createModel({ id: "glm-5-3-flash", provider: "zai", openWeights: false });
    const or = createModel({ id: "glm-5-3-flash", provider: "openrouter", openWeights: undefined });
    const result = normalizeOpenWeights([hf, zai, or]);
    expect(result.every((m) => m.openWeights === true)).toBe(true);
  });

  it("matches entries across ID formats", () => {
    const direct = createModel({ id: "glm-5.3-flash", provider: "zai", openWeights: false });
    const slugged = createModel({ id: "z-ai/glm-5-3-flash", provider: "openrouter", openWeights: true });
    const result = normalizeOpenWeights([direct, slugged]);
    expect(result[0].openWeights).toBe(true);
  });

  it("leaves models with no true entry unchanged", () => {
    const a = createModel({ id: "gpt-5-6", provider: "openai", openWeights: false });
    const b = createModel({ id: "gpt-5-6", provider: "openrouter", openWeights: undefined });
    const result = normalizeOpenWeights([a, b]);
    expect(result[0].openWeights).toBe(false);
    expect(result[1].openWeights).toBeUndefined();
  });

  it("does not mix distinct models", () => {
    const open = createModel({ id: "glm-5-3-flash", provider: "huggingface", openWeights: true });
    const closed = createModel({ id: "gpt-5-6", provider: "openai", openWeights: false });
    const result = normalizeOpenWeights([open, closed]);
    expect(result.find((m) => m.id === "gpt-5-6")!.openWeights).toBe(false);
  });

  it("preserves order and extra fields", () => {
    const a = createModel({ id: "m-1", openWeights: true });
    const b = createModel({ id: "m-2", openWeights: false });
    const result = normalizeOpenWeights([a, b]);
    expect(result.map((m) => m.id)).toEqual(["m-1", "m-2"]);
    expect(result[0]).toEqual(a);
  });
});
