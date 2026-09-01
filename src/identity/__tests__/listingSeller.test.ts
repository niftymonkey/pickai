import { describe, it, expect } from "vitest";
import { listingSeller } from "../listingSeller";

describe("listingSeller", () => {
  it("returns the prefix when the id carries one", () => {
    expect(listingSeller("anthropic/claude-3.7-sonnet")).toBe("anthropic");
    expect(listingSeller("meta-llama/llama-3.1-70b")).toBe("meta-llama");
    expect(listingSeller("mistralai/devstral-2512:free")).toBe("mistralai");
  });

  it("returns the first segment of a nested seller path", () => {
    expect(listingSeller("fireworks/models/glm-4-6")).toBe("fireworks");
  });

  it("returns null when the id carries no prefix", () => {
    expect(listingSeller("gpt-4o")).toBeNull();
  });

  it("never guesses a seller from the model name", () => {
    // "claude-3.7-sonnet" tells us who made it, not who is selling it.
    expect(listingSeller("claude-3.7-sonnet")).toBeNull();
  });
});
