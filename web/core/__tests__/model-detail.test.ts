import { describe, it, expect } from "vitest";
import { capabilities, steeringSentence } from "../model-detail";

const sayFor = (name: string, values: Record<string, boolean | undefined>): string =>
  capabilities(values).find((capability) => capability.name === name)!.say;

describe("what the source said about a capability", () => {
  // models.dev never mentions structured output for a third of the catalog. A rule
  // that reads that silence as "no" cuts models for never having been labelled.
  it("keeps a capability the source never mentioned apart from one it denied", () => {
    expect(sayFor("structuredOutput", {})).toBe("unstated");
    expect(sayFor("structuredOutput", { structuredOutput: false })).toBe("no");
  });

  it("reads a stated true as a yes", () => {
    expect(sayFor("attachment", { attachment: true })).toBe("yes");
  });

  it("shows every capability in the panel's order whatever the source stated", () => {
    expect(capabilities({}).map(({ label }) => label)).toEqual([
      "Reasoning",
      "Tool calling",
      "Structured output",
      "Attachments",
      "Open weights",
      "Temperature",
    ]);
  });
});

describe("how the reasoning is steered", () => {
  it("names the effort levels the model accepts", () => {
    expect(steeringSentence([{ kind: "effort", values: ["low", "high"] }])).toBe(
      "Steered by effort levels low, high.",
    );
  });

  it("names a thinking budget's range", () => {
    expect(steeringSentence([{ kind: "budgetTokens", min: 1024, max: 32000 }])).toBe(
      "Steered by a thinking budget of 1,024 to 32,000 tokens.",
    );
  });

  it("describes a budget with no published range without inventing one", () => {
    expect(steeringSentence([{ kind: "budgetTokens" }])).toBe("Steered by a thinking budget.");
  });

  it("joins every control the source published", () => {
    expect(
      steeringSentence([{ kind: "effort", values: ["low"] }, { kind: "toggle" }]),
    ).toBe("Steered by effort levels low, and an on-off switch.");
  });

  it("says nothing when the source published no steering control", () => {
    expect(steeringSentence(undefined)).toBeNull();
    expect(steeringSentence([])).toBeNull();
  });
});
