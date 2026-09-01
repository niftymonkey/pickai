import { expect, test } from "vitest";
import type { Model, ModelIdentity } from "pickai";
import { catalogCounts, catalogRows } from "../catalog-view";

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
  const rows = catalogRows([
    identity({
      key: "gpt-4o",
      maker: "openai",
      representative: listing(),
      listings: [listing(), listing({ provider: "azure" }), listing({ provider: "openrouter" })],
    }),
  ]);
  expect(rows).toEqual([
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
    },
  ]);
});
test("absent cost marks both prices unknown", () => {
  const [row] = catalogRows([identity({ representative: listing({ cost: undefined }) })]);
  expect(row.costIn).toBeNull();
  expect(row.costOut).toBeNull();
});
test("a published zero price stays zero, not unknown", () => {
  const [row] = catalogRows([
    identity({ representative: listing({ cost: { input: 0, output: 0 } }) }),
  ]);
  expect(row.costIn).toBe(0);
  expect(row.costOut).toBe(0);
});
test("zero context marks context unknown", () => {
  const [row] = catalogRows([
    identity({ representative: listing({ limit: { context: 0, output: 16_384 } }) }),
  ]);
  expect(row.context).toBeNull();
  expect(row.output).toBe(16_384);
});
test("zero max output marks output unknown", () => {
  const [row] = catalogRows([
    identity({ representative: listing({ limit: { context: 128_000, output: 0 } }) }),
  ]);
  expect(row.output).toBeNull();
  expect(row.context).toBe(128_000);
});
test("absent release date and knowledge cutoff mark unknown", () => {
  const [row] = catalogRows([
    identity({ representative: listing({ releaseDate: undefined, knowledge: undefined }) }),
  ]);
  expect(row.released).toBeNull();
  expect(row.cutoff).toBeNull();
});
test("rows order by display name A-Z and the order is stable", () => {
  const rows = catalogRows([
    identity({ key: "mistral-large", representative: listing({ id: "mistral-large", name: "Mistral Large" }) }),
    identity({ key: "gpt-4o", representative: listing({ id: "gpt-4o", name: "GPT-4o" }) }),
    identity({ key: "grok-4", representative: listing({ id: "grok-4", name: "Grok 4" }) }),
    identity({ key: "claude-sonnet-4-5", representative: listing({ id: "claude-sonnet-4-5", name: "Claude Sonnet 4.5" }) }),
  ]);
  expect(rows.map(({ name }) => name)).toEqual([
    "Claude Sonnet 4.5",
    "GPT-4o",
    "Grok 4",
    "Mistral Large",
  ]);

  const twins = catalogRows([
    identity({ key: "ministral-8b-2410", representative: listing({ id: "ministral-8b-2410", name: "Ministral 8B" }) }),
    identity({ key: "ministral-8b", representative: listing({ id: "ministral-8b", name: "Ministral 8B" }) }),
  ]);
  expect(twins.map(({ key }) => key)).toEqual(["ministral-8b-2410", "ministral-8b"]);
});
