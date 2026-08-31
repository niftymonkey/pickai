import { describe, it, expect } from "vitest";
import { matchesModel } from "../matchesModel";

describe("matchesModel", () => {
  it("matches a prefixed id to a dated bare id", () => {
    expect(matchesModel("anthropic/claude-3.5-haiku", "claude-3-5-haiku-20241022")).toBe(true);
    expect(matchesModel("anthropic/claude-3.7-sonnet", "claude-3-7-sonnet-20250219")).toBe(true);
  });

  it("matches an id to itself", () => {
    expect(matchesModel("gpt-4o", "gpt-4o")).toBe(true);
  });

  it("matches whatever the case", () => {
    expect(matchesModel("GPT-4O", "gpt-4o")).toBe(true);
    expect(matchesModel("Claude-Sonnet-4-5", "claude-sonnet-4-5")).toBe(true);
  });

  it("separates two genuinely different models", () => {
    expect(matchesModel("gpt-4o", "gpt-4o-mini")).toBe(false);
  });

  it("matches a display name with spaces to the hyphenated id", () => {
    expect(matchesModel("Claude Sonnet 4.5", "claude-sonnet-4-5")).toBe(true);
  });

  it("matches a variant listing to its base model", () => {
    // Changed from v2, which held these apart. See normalizeModelId.
    expect(
      matchesModel("anthropic/claude-3.7-sonnet", "anthropic/claude-3.7-sonnet:thinking"),
    ).toBe(true);
  });
});
