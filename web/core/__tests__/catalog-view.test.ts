import { expect, test } from "vitest";
import type { Model, ModelIdentity } from "pickai";
import { catalogCounts, rowFromIdentity } from "../catalog-view";

const listing = (overrides: Partial<Model> = {}): Model => ({
  id: "gpt-4o",
  name: "GPT-4o",
  provider: "openai",
  cost: { input: 2.5, output: 10 },
  limit: { context: 128_000, output: 16_384 },
  modalities: { input: ["text"], output: ["text"] },
  releaseDate: "2024-05-13",
  knowledge: "2023-10",
  openRouterId: "openai/gpt-4o",
  ...overrides,
});

const identity = (overrides: Partial<ModelIdentity> = {}): ModelIdentity => {
  const representative = overrides.representative ?? listing();
  return {
    key: "gpt-4o",
    maker: "openai",
    representative,
    listings: [representative],
    ...overrides,
  };
};

test("counts count models and listings in both units", () => {
  const identities = [
    identity({ key: "gpt-4o", listings: [listing(), listing({ provider: "azure" })] }),
    identity({ key: "claude-sonnet-4-5", listings: [listing({ id: "claude-sonnet-4-5" })] }),
  ];
  expect(catalogCounts(identities)).toEqual({ models: 2, listings: 3 });
});
test("a row carries the representative's facts and the identity's maker and seller count", () => {
  const row = rowFromIdentity(
    identity({
      key: "gpt-4o",
      maker: "openai",
      representative: listing(),
      listings: [listing(), listing({ provider: "azure" }), listing({ provider: "openrouter" })],
    }),
  );
  expect(row).toEqual(
    {
      key: "gpt-4o",
      name: "GPT-4o",
      maker: "openai",
      sellerCount: 3,
      costIn: 2.5,
      costOut: 10,
      context: 128_000,
      output: 16_384,
      released: "2024-05-13",
      cutoff: "2023-10",
      about: null,
      family: null,
      updated: null,
      cacheRead: null,
      cacheWrite: null,
      modalitiesIn: ["text"],
      modalitiesOut: ["text"],
      capabilityValues: {
        reasoning: undefined,
        toolCall: undefined,
        structuredOutput: undefined,
        attachment: undefined,
        openWeights: undefined,
        temperature: undefined,
      },
      reasoningOptions: undefined,
      deprecated: false,
    },
  );
});

test("a row carries the description the source publishes", () => {
  const row = rowFromIdentity(
    identity({ representative: listing({ description: "Fast, intelligent model" }) }),
  );
  expect(row.about).toBe("Fast, intelligent model");
});

// A rule that reads silence as a no cuts models for never having been labelled.
test("a row keeps a capability the source never stated apart from one it denied", () => {
  const silent = rowFromIdentity(identity({ representative: listing() }));
  const denied = rowFromIdentity(
    identity({ representative: listing({ structuredOutput: false }) }),
  );
  expect(silent.capabilityValues.structuredOutput).toBeUndefined();
  expect(denied.capabilityValues.structuredOutput).toBe(false);
});
test("absent cost marks both prices unknown", () => {
  const row = rowFromIdentity(identity({ representative: listing({ cost: undefined }) }));
  expect(row.costIn).toBeNull();
  expect(row.costOut).toBeNull();
});
test("a published zero price stays zero, not unknown", () => {
  const row = rowFromIdentity(identity({ representative: listing({ cost: { input: 0, output: 0 } }) }));
  expect(row.costIn).toBe(0);
  expect(row.costOut).toBe(0);
});
test("zero context marks context unknown", () => {
  const row = rowFromIdentity(identity({ representative: listing({ limit: { context: 0, output: 16_384 } }) }));
  expect(row.context).toBeNull();
  expect(row.output).toBe(16_384);
});
test("zero max output marks output unknown", () => {
  const row = rowFromIdentity(identity({ representative: listing({ limit: { context: 128_000, output: 0 } }) }));
  expect(row.output).toBeNull();
  expect(row.context).toBe(128_000);
});
test("absent release date and knowledge cutoff mark unknown", () => {
  const row = rowFromIdentity(identity({ representative: listing({ releaseDate: undefined, knowledge: undefined }) }));
  expect(row.released).toBeNull();
  expect(row.cutoff).toBeNull();
});
