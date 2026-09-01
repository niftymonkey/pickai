import { describe, it, expect } from "vitest";
import { parseModelId } from "../parseModelId";

describe("parseModelId", () => {
  it("splits a prefixed id into seller and model", () => {
    expect(parseModelId("anthropic/claude-3.7-sonnet")).toEqual({
      seller: "anthropic",
      model: "claude-3.7-sonnet",
      variant: undefined,
    });
  });

  it("reports a null seller when the id carries no prefix", () => {
    expect(parseModelId("gpt-4o")).toEqual({
      seller: null,
      model: "gpt-4o",
      variant: undefined,
    });
  });

  it("pulls a variant off a prefixed id", () => {
    expect(parseModelId("anthropic/claude-3.7-sonnet:thinking")).toEqual({
      seller: "anthropic",
      model: "claude-3.7-sonnet",
      variant: "thinking",
    });
  });

  it("pulls a variant off a bare id", () => {
    expect(parseModelId("claude-3-7-sonnet:thinking")).toEqual({
      seller: null,
      model: "claude-3-7-sonnet",
      variant: "thinking",
    });
  });

  it("leaves variant undefined when there is none", () => {
    expect(parseModelId("openai/gpt-4o").variant).toBeUndefined();
  });
});
