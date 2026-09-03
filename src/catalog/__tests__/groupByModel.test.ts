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

const named = (id: string, provider: string, name: string) => ({
  ...listing(id, provider),
  name,
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

  it("folds two ids into one identity when they share a name and a maker", () => {
    // models.dev giving two entries one name and one maker is the source saying
    // they are one model, and that is trusted over what the id strings look like.
    const plain = named("claude-opus-5", "anthropic", "Claude Opus 5");
    const quantized = named("claude-opus-5-fp8", "deepinfra", "Claude Opus 5");
    const identities = groupByModel([plain, quantized]);
    expect(identities).toHaveLength(1);
    expect(identities[0].maker).toBe("anthropic");
  });

  it("keeps two models apart when the shared name has different makers", () => {
    const anthropic = named("claude-opus-5", "anthropic", "Opus");
    const alibaba = named("qwen3-max", "alibaba", "Opus");
    const identities = groupByModel([anthropic, alibaba]);
    expect(identities).toHaveLength(2);
  });

  it("folds names that differ only in case or punctuation", () => {
    const hyphenated = named("glm-5-2", "zhipuai", "GLM-5.2");
    const spaced = named("glm5p2", "vultr", "glm 5.2");
    const identities = groupByModel([hyphenated, spaced]);
    expect(identities).toHaveLength(1);
  });

  it("folds two listings that share a name and have no known maker", () => {
    const one = named("duo-standard", "gitlab", "Duo Standard");
    const other = named("duo-standard-v2", "gitlab", "Duo Standard");
    const identities = groupByModel([one, other]);
    expect(identities).toHaveLength(1);
    expect(identities[0].maker).toBeNull();
  });

  it("keeps every listing of every id it absorbed", () => {
    const plain = named("claude-opus-5", "anthropic", "Claude Opus 5");
    const resold = named("openrouter/claude-opus-5", "openrouter", "Claude Opus 5");
    const dated = named("claude-opus-5@default", "google-vertex", "Claude Opus 5");
    const quantized = named("claude-opus-5-fp8", "deepinfra", "Claude Opus 5");
    const identities = groupByModel([plain, resold, dated, quantized]);
    expect(identities[0].listings).toEqual([plain, resold, dated, quantized]);
  });

  it("keys a merged identity by the id the most sellers publish", () => {
    // A benchmark join matches on the key, so the canonical id has to win over a
    // shorter typo variant. The answer is the same whatever order the catalog arrives in.
    const typo = named("claude-opus5", "cortecs", "Claude Opus 5");
    const canonical = named("claude-opus-5", "anthropic", "Claude Opus 5");
    const alsoCanonical = named("claude-opus-5", "bedrock", "Claude Opus 5");
    expect(groupByModel([typo, canonical, alsoCanonical])[0].key).toBe("claude-opus-5");
    expect(groupByModel([alsoCanonical, typo, canonical])[0].key).toBe("claude-opus-5");
  });

  it("breaks a tie on listing count by taking the shorter id", () => {
    // Two ids with one seller each: the answer still cannot depend on arrival order.
    const longer = named("claude-opus-5-fp8", "deepinfra", "Claude Opus 5");
    const shorter = named("claude-opus5", "cortecs", "Claude Opus 5");
    expect(groupByModel([longer, shorter])[0].key).toBe("claude-opus5");
    expect(groupByModel([shorter, longer])[0].key).toBe("claude-opus5");
  });

  it("elects the maker's own listing over the whole merged set", () => {
    // The election runs once, after the merge, so a listing absorbed from
    // another id can still speak for the model.
    const quantized = named("claude-opus-5-fp8", "deepinfra", "Claude Opus 5");
    const anthropic = named("claude-opus-5", "anthropic", "Claude Opus 5");
    expect(groupByModel([quantized, anthropic])[0].representative).toBe(anthropic);
  });
});
