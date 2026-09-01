import { describe, it, expect, test } from "vitest";
import { groupByModel } from "../groupByModel";

const listing = (id: string, provider: string, input?: number) => ({
  id,
  name: id,
  provider,
  limit: { context: 200000, output: 8192 },
  modalities: { input: ["text"], output: ["text"] },
  openRouterId: `${provider}/${id}`,
  ...(input === undefined ? {} : { cost: { input, output: input * 4 } }),
});

describe("groupByModel", () => {
  it("folds every listing of one model into one identity and keeps them all", () => {
    const anthropic = listing("claude-opus-5", "anthropic", 15);
    const openrouter = listing("openrouter/claude-opus-5", "openrouter", 15);
    const dated = listing("claude-opus-5-20250514", "amazon-bedrock", 15);
    const identities = groupByModel([anthropic, openrouter, dated]);
    expect(identities).toHaveLength(1);
    expect(identities[0].listings).toEqual([anthropic, openrouter, dated]);
  });
  it("gives distinct models distinct identities", () => {
    const claude = listing("claude-opus-5", "anthropic", 15);
    const gpt = listing("gpt-5.2", "openai", 10);
    const identities = groupByModel([claude, gpt]);
    expect(identities.map((identity) => identity.key)).toEqual(["claude-opus-5", "gpt-5-2"]);
  });
  it("keys the group by the normalized id, folding seller paths, dates, and variants", () => {
    const nested = listing("fireworks/models/glm-4-6", "fireworks", 1);
    const dotted = listing("glm-4.6", "zhipuai", 1);
    const variant = listing("openrouter/glm-4.6:thinking", "openrouter", 1);
    const identities = groupByModel([nested, dotted, variant]);
    expect(identities).toHaveLength(1);
    expect(identities[0].key).toBe("glm-4-6");
  });
  it("names the maker from the model name and leaves it null when unknown", () => {
    const glm = listing("glm-4.6", "zhipuai", 1);
    const unknown = listing("duo-standard", "gitlab", 1);
    const identities = groupByModel([glm, unknown]);
    expect(identities[0].maker).toBe("zhipuai");
    expect(identities[1].maker).toBeNull();
  });
  it("elects the maker's listing as the representative", () => {
    const reseller = listing("openrouter/claude-opus-5", "openrouter", 12);
    const anthropic = listing("claude-opus-5", "anthropic", 15);
    const identities = groupByModel([reseller, anthropic]);
    expect(identities[0].representative).toBe(anthropic);
  });
  it("returns an empty list for an empty catalog", () => {
    expect(groupByModel([])).toEqual([]);
  });
});
