import { describe, it, expect } from "vitest";
import { groupByProvider } from "./group";
import { enrich } from "./enrich";
import { createModel, fixtures } from "./test-utils";

const models = [
  fixtures.sonnet, // anthropic
  fixtures.opus, // anthropic
  fixtures.gpt4o, // openai
  fixtures.gpt4oMini, // openai
  fixtures.flash, // google
  fixtures.coder, // deepseek
];

describe("groupByProvider", () => {
  it("groups models by provider", () => {
    const groups = groupByProvider(models);
    expect(groups).toHaveLength(4);
    expect(groups.find((g) => g.provider === "anthropic")?.models).toHaveLength(2);
    expect(groups.find((g) => g.provider === "openai")?.models).toHaveLength(2);
    expect(groups.find((g) => g.provider === "google")?.models).toHaveLength(1);
    expect(groups.find((g) => g.provider === "deepseek")?.models).toHaveLength(1);
  });

  it("sorts providers alphabetically by default", () => {
    const groups = groupByProvider(models);
    expect(groups.map((g) => g.provider)).toEqual([
      "anthropic",
      "deepseek",
      "google",
      "openai",
    ]);
  });

  it("pins priority providers to the top in given order", () => {
    const groups = groupByProvider(models, {
      priority: ["openai", "google"],
    });
    expect(groups.map((g) => g.provider)).toEqual([
      "openai",
      "google",
      "anthropic",
      "deepseek",
    ]);
  });

  it("sorts non-priority providers alphabetically after priority", () => {
    const extra = [
      ...models,
      createModel({ id: "zephyr", provider: "huggingface" }),
      createModel({ id: "mistral-large", provider: "mistralai" }),
    ];
    const groups = groupByProvider(extra, {
      priority: ["anthropic"],
    });
    expect(groups[0].provider).toBe("anthropic");
    const rest = groups.slice(1).map((g) => g.provider);
    expect(rest).toEqual(["deepseek", "google", "huggingface", "mistralai", "openai"]);
  });

  it("includes providerName for display", () => {
    const groups = groupByProvider(models);
    const names = groups.map((g) => g.providerName);
    expect(names).toContain("Anthropic");
    expect(names).toContain("OpenAI");
    expect(names).toContain("Google");
    expect(names).toContain("DeepSeek");
  });

  it("preserves enriched model types through generics", () => {
    const enriched = models.map(enrich);
    const groups = groupByProvider(enriched);
    expect(groups[0].models[0].tier).toBeDefined();
    expect(groups[0].models[0].priceLabel).toBeDefined();
  });

  it("composes with .map() for rendering", () => {
    const result = groupByProvider(models).map((g) => ({
      label: g.providerName,
      count: g.models.length,
    }));
    expect(result).toEqual([
      { label: "Anthropic", count: 2 },
      { label: "DeepSeek", count: 1 },
      { label: "Google", count: 1 },
      { label: "OpenAI", count: 2 },
    ]);
  });

  it("returns empty array for empty input", () => {
    expect(groupByProvider([])).toEqual([]);
  });
});
