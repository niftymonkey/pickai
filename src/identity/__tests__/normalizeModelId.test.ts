import { describe, it, expect } from "vitest";
import { normalizeModelId } from "../normalizeModelId";

describe("normalizeModelId", () => {
  it("drops the seller prefix", () => {
    expect(normalizeModelId("anthropic/claude-3.7-sonnet")).toBe("claude-3-7-sonnet");
    expect(normalizeModelId("openai/gpt-4o")).toBe("gpt-4o");
  });

  it("drops every segment of a nested seller path", () => {
    // The catalog carries ids like "fireworks/models/glm-4-6". Keeping the middle
    // segment made the same model group twice, once per seller path shape.
    expect(normalizeModelId("fireworks/models/glm-4-6")).toBe("glm-4-6");
    expect(normalizeModelId("meta-llama/llama-3.1-70b-instruct")).toBe("llama-3-1-70b-instruct");
  });

  it("turns dots into hyphens so 3.7 and 3-7 agree", () => {
    expect(normalizeModelId("claude-opus-4.5")).toBe("claude-opus-4-5");
    expect(normalizeModelId("model-3.5.1")).toBe("model-3-5-1");
  });

  it("drops an eight digit date suffix", () => {
    expect(normalizeModelId("claude-3-7-sonnet-20250219")).toBe("claude-3-7-sonnet");
    expect(normalizeModelId("gpt-4o")).toBe("gpt-4o");
  });

  it("lowercases the result", () => {
    expect(normalizeModelId("GPT-4O")).toBe("gpt-4o");
  });

  it("drops a colon variant suffix", () => {
    // Changed from v2, which kept the suffix. pickai is not a router (9.24), so a
    // :thinking listing is the same model as its base.
    expect(normalizeModelId("anthropic/claude-3.7-sonnet:thinking")).toBe("claude-3-7-sonnet");
    expect(normalizeModelId("mistralai/devstral-2512:free")).toBe("devstral-2512");
  });

  it("turns spaces into hyphens so a display name matches an id", () => {
    expect(normalizeModelId("Claude Sonnet 4.5")).toBe("claude-sonnet-4-5");
  });

  it("gives one key for the same model written three ways", () => {
    const key = normalizeModelId("claude-3-5-haiku-20241022");
    expect(normalizeModelId("anthropic/claude-3.5-haiku")).toBe(key);
    expect(normalizeModelId("Claude 3.5 Haiku")).toBe(key);
  });
});
