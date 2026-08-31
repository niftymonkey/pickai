import { describe, it, expect, test } from "vitest";
import { ruleLabel } from "../rule";

describe("ruleLabel", () => {
  it("puts every rule kind into plain words", () => {
    expect(ruleLabel({ kind: "provider", mode: "allow", providers: ["anthropic", "openai"] })).toBe("Only sold by anthropic, openai");
    expect(ruleLabel({ kind: "provider", mode: "exclude", providers: ["openrouter"] })).toBe("Never sold by openrouter");
    expect(ruleLabel({ kind: "maker", mode: "allow", makers: ["anthropic"] })).toBe("Only made by anthropic");
    expect(ruleLabel({ kind: "maker", mode: "exclude", makers: ["anthropic"] })).toBe("Never made by anthropic");
    expect(ruleLabel({ kind: "capability", capability: "toolCall" })).toBe("Needs tool calling");
    expect(ruleLabel({ kind: "modality", side: "input", modality: "image" })).toBe("Takes image input");
    expect(ruleLabel({ kind: "modality", side: "output", modality: "audio" })).toBe("Gives audio output");
    expect(ruleLabel({ kind: "minContext", tokens: 128000 })).toBe("Context at least 128K");
    expect(ruleLabel({ kind: "minOutput", tokens: 16384 })).toBe("Output at least 16,384");
    expect(ruleLabel({ kind: "costFence", side: "input", ceiling: 50 })).toBe("Input price at most $50/M");
    expect(ruleLabel({ kind: "costFence", side: "output", ceiling: 100 })).toBe("Output price at most $100/M");
    expect(ruleLabel({ kind: "minKnowledge", date: "2024-01" })).toBe("Knows the world since 2024-01");
    expect(ruleLabel({ kind: "excludeDeprecated" })).toBe("No deprecated models");
  });
});
