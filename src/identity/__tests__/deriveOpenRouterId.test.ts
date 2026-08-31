import { describe, it, expect } from "vitest";
import { deriveOpenRouterId } from "../deriveOpenRouterId";

describe("deriveOpenRouterId", () => {
  it("turns an anthropic trailing version hyphen into a dot", () => {
    expect(deriveOpenRouterId("anthropic", "claude-sonnet-4-5")).toBe("anthropic/claude-sonnet-4.5");
    expect(deriveOpenRouterId("anthropic", "claude-opus-4-5")).toBe("anthropic/claude-opus-4.5");
  });

  it("leaves an anthropic single digit version alone", () => {
    expect(deriveOpenRouterId("anthropic", "claude-sonnet-4")).toBe("anthropic/claude-sonnet-4");
  });

  it("writes mistral as mistralai", () => {
    expect(deriveOpenRouterId("mistral", "mistral-large-2411")).toBe("mistralai/mistral-large-2411");
  });

  it("writes xai as x-ai", () => {
    expect(deriveOpenRouterId("xai", "grok-4-fast")).toBe("x-ai/grok-4-fast");
  });

  it("drops a date suffix instead of colliding with the version dot", () => {
    // v2 emitted "anthropic/claude-sonnet-4-5.20250929" here.
    expect(deriveOpenRouterId("anthropic", "claude-sonnet-4-5-20250929")).toBe(
      "anthropic/claude-sonnet-4.5",
    );
  });

  it("passes other providers through untouched", () => {
    expect(deriveOpenRouterId("openai", "gpt-4o")).toBe("openai/gpt-4o");
    expect(deriveOpenRouterId("google", "gemini-2-5-flash")).toBe("google/gemini-2-5-flash");
    expect(deriveOpenRouterId("openai", "gpt-5-2-pro")).toBe("openai/gpt-5-2-pro");
  });
});
