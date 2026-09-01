import { describe, it, expect } from "vitest";
import { modelMaker } from "../modelMaker";

describe("modelMaker", () => {
  it("names the maker from a bare model name", () => {
    expect(modelMaker("claude-opus-4-5")).toBe("anthropic");
    expect(modelMaker("gpt-5.1")).toBe("openai");
    expect(modelMaker("gemini-3-pro")).toBe("google");
    expect(modelMaker("qwen3-max")).toBe("alibaba");
  });

  it("names the maker whatever seller is selling it", () => {
    expect(modelMaker("openrouter/claude-opus-4-5")).toBe("anthropic");
    expect(modelMaker("deepinfra/llama-3.1-70b-instruct")).toBe("meta");
    expect(modelMaker("fireworks/models/glm-4-6")).toBe("zhipuai");
  });

  it("names the maker through a region prefixed bedrock id", () => {
    expect(modelMaker("us.anthropic.claude-3-5-sonnet-20240620")).toBe("anthropic");
  });

  it("names the maker when the family token carries a version, as in gemma4", () => {
    expect(modelMaker("gemma4-27b")).toBe("google");
    expect(modelMaker("qwen25-coder-32b")).toBe("alibaba");
  });

  it("returns null when no known family appears in the name", () => {
    expect(modelMaker("duo-standard")).toBeNull();
    expect(modelMaker("some-unknown-model")).toBeNull();
  });

  it("returns null rather than falling back to the seller", () => {
    // Unknown maker has to stay unknown: finding 14 lets it survive an exclude
    // rule and fail an allow rule, and a seller standing in for it breaks both.
    expect(modelMaker("deepinfra/some-unknown-model")).toBeNull();
  });
});
