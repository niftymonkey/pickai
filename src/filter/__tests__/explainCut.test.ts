import { describe, it, expect } from "vitest";
import { explainCut } from "../explainCut";

const listing = (
  id: string,
  provider: string,
  extra: Record<string, unknown> = {},
) => ({
  id,
  name: id,
  provider,
  limit: { context: 200000, output: 8192 },
  modalities: { input: ["text"], output: ["text"] },
  openRouterId: `${provider}/${id}`,
  ...extra,
});

type Listing = ReturnType<typeof listing>;

const identity = (
  key: string,
  maker: string | null,
  listings: Listing[],
  representative: Listing = listings[0],
) => ({ key, maker, representative, listings });

describe("explainCut", () => {
  it("names the first rule that removes the model, in rule order", () => {
    const davinci = identity("davinci-002", "openai", [listing("davinci-002", "openai")]);
    const needsTools = { kind: "capability", capability: "toolCall" } as const;
    const fence = { kind: "costFence", side: "input", ceiling: 50 } as const;
    expect(explainCut(davinci, [needsTools, fence])).toBe(needsTools);
  });
  it("returns undefined for a model that survives every rule", () => {
    const claude = identity("claude-opus-5", "anthropic", [
      listing("claude-opus-5", "anthropic", { toolCall: true }),
    ]);
    expect(explainCut(claude, [{ kind: "capability", capability: "toolCall" }])).toBeUndefined();
  });
  it("attributes the cut to the provider rule that removed the last seller", () => {
    const claude = identity("claude-opus-5", "anthropic", [
      listing("claude-opus-5", "anthropic"),
      listing("openrouter/claude-opus-5", "openrouter"),
    ]);
    const first = { kind: "provider", mode: "exclude", providers: ["anthropic"] } as const;
    const second = { kind: "provider", mode: "exclude", providers: ["openrouter"] } as const;
    expect(explainCut(claude, [first, second])).toBe(second);
  });
});

describe("metric rules", () => {
  it("names the metric rule that cut a model", () => {
    const weak = {
      ...identity("davinci-002", "openai", [listing("davinci-002", "openai")]),
      metrics: { overall: 1200 },
    };
    const floor = { kind: "metric", metric: "overall", min: 1400 } as const;
    expect(explainCut(weak, [floor])).toBe(floor);
  });
});
