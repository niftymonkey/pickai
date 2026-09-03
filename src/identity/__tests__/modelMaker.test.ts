import { describe, it, expect, test } from "vitest";
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

  it("reports the model's maker, not the reseller written in front of it", () => {
    // Issue #25: databricks resells other makers' models under its own byline.
    // A leading organization name followed by another maker's family is a
    // reseller, and the family behind it is who built the model.
    expect(modelMaker("databricks-claude-opus-4-7")).toBe("anthropic");
    expect(modelMaker("databricks-glm-5-2")).toBe("zhipuai");
    expect(modelMaker("snowflake-llama3-3-70b")).toBe("meta");
  });

  it("still reports the maker when the maker wrote its own name in front", () => {
    expect(modelMaker("anthropic-claude-opus-4-7")).toBe("anthropic");
    expect(modelMaker("meta-llama-3-3-70b-instruct")).toBe("meta");
    expect(modelMaker("alibaba-qwen3-32b")).toBe("alibaba");
  });

  it("still reports a reseller as the maker of the models it built itself", () => {
    // The byline is only dropped when another maker's family follows it, so a
    // reseller's own model keeps its maker and "deepseek-v4-flash" never
    // degrades to the nonsense key its stripped form would leave behind.
    expect(modelMaker("dbrx")).toBe("databricks");
    expect(modelMaker("deepseek-v4-flash")).toBe("deepseek");
    expect(modelMaker("deepseek-r1-distill-llama-70b")).toBe("deepseek");
  });

  it("reports no maker for an id whose leading name is all it has", () => {
    expect(modelMaker("databricks-duo-standard")).toBe("databricks");
    expect(modelMaker("acme-duo-standard")).toBeNull();
  });
});
