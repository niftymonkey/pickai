import { describe, it, expect } from "vitest";
import { createPicker } from "./picker";
import { Purpose } from "./purpose";
import { allModels, fixtures } from "./test-utils";

const testSource = () => Promise.resolve(allModels);

describe("createPicker", () => {
  it("constructs from a source function", async () => {
    const pick = await createPicker(testSource);
    expect(pick).toBeDefined();
    expect(typeof pick.find).toBe("function");
    expect(typeof pick.recommend).toBe("function");
  });

  it("find() works on picker", async () => {
    const pick = await createPicker(testSource);
    const result = pick.find({ limit: 3 });
    expect(result).toHaveLength(3);
    expect(result[0].id).toBeDefined();
  });

  it("recommend() works on picker", async () => {
    const pick = await createPicker(testSource);
    const result = pick.recommend(Purpose.Cheap, { limit: 3 });
    expect(result).toHaveLength(3);
    expect(result[0].score).toBeDefined();
    expect(result[0].id).toBe(fixtures.flash.id);
  });

  it("multiple calls reuse the same data", async () => {
    let callCount = 0;
    const countingSource = () => {
      callCount++;
      return Promise.resolve(allModels);
    };
    const pick = await createPicker(countingSource);
    pick.find({ limit: 5 });
    pick.find({ limit: 3 });
    pick.recommend(Purpose.Balanced, { limit: 2 });
    expect(callCount).toBe(1);
  });

  it("find with filter works", async () => {
    const pick = await createPicker(testSource);
    const result = pick.find({
      filter: { reasoning: true },
      limit: 10,
    });
    for (const m of result) {
      expect(m.reasoning).toBe(true);
    }
  });

  it("recommend with constraints works", async () => {
    const { perProvider } = await import("./constraints");
    const pick = await createPicker(testSource);
    const result = pick.recommend(Purpose.Quality, {
      constraints: [perProvider(1)],
      limit: 4,
    });
    expect(result).toHaveLength(4);
    // Check for provider diversity in first pass results
    const providers = result.map((m) => m.provider);
    expect(new Set(providers).size).toBeGreaterThan(1);
  });
});
