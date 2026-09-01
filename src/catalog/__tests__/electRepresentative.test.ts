import { describe, it, expect, test } from "vitest";
import { electRepresentative } from "../electRepresentative";

const listing = (id: string, provider: string, input?: number) => ({
  id,
  name: id,
  provider,
  limit: { context: 200000, output: 8192 },
  modalities: { input: ["text"], output: ["text"] },
  openRouterId: `${provider}/${id}`,
  ...(input === undefined ? {} : { cost: { input, output: input * 4 } }),
});

describe("electRepresentative", () => {
  it("elects the maker's own listing when the maker sells the model", () => {
    const anthropic = listing("claude-opus-5", "anthropic", 15);
    const reseller = listing("openrouter/claude-opus-5", "openrouter", 12);
    expect(electRepresentative([reseller, anthropic], "anthropic")).toBe(anthropic);
  });
  it("elects a direct API seller over a cheaper reseller when the maker does not sell", () => {
    // mistral is in DIRECT_PROVIDERS; the maker meta sells nothing here.
    const direct = listing("mistral/llama-3-70b", "mistral", 5);
    const reseller = listing("deepinfra/llama-3-70b", "deepinfra", 1);
    expect(electRepresentative([reseller, direct], "meta")).toBe(direct);
  });
  it("elects the cheapest known price among several direct API sellers", () => {
    const pricier = listing("mistral/gemma-2-27b", "mistral", 8);
    const cheaper = listing("deepseek/gemma-2-27b", "deepseek", 2);
    expect(electRepresentative([pricier, cheaper], null)).toBe(cheaper);
  });
  it("elects the cheapest known price reseller when no direct API seller exists", () => {
    const pricier = listing("openrouter/yi-large", "openrouter", 3);
    const cheaper = listing("deepinfra/yi-large", "deepinfra", 1);
    expect(electRepresentative([pricier, cheaper], null)).toBe(cheaper);
  });
  it("never elects on a zero price, which is a catalog error", () => {
    // Reseller $0 prices are known catalog errors (finding 10); they must not win.
    const zero = listing("openrouter/yi-large", "openrouter", 0);
    const paid = listing("deepinfra/yi-large", "deepinfra", 2);
    expect(electRepresentative([zero, paid], null)).toBe(paid);
  });
  it("elects the first of the pool when every price is unknown", () => {
    const first = listing("openrouter/yi-large", "openrouter");
    const second = listing("deepinfra/yi-large", "deepinfra");
    expect(electRepresentative([first, second], null)).toBe(first);
  });
  it("skips the maker step when the maker is unknown", () => {
    const direct = listing("mistral/duo-standard", "mistral", 5);
    const reseller = listing("openrouter/duo-standard", "openrouter", 1);
    expect(electRepresentative([reseller, direct], null)).toBe(direct);
  });
  it("throws when given no listings", () => {
    // An empty group cannot exist; reaching here is a bug and must fail loudly.
    expect(() => electRepresentative([], null)).toThrow();
  });
});
