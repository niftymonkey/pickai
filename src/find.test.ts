import { describe, it, expect } from "vitest";
import { find } from "./find";
import { sortByCost } from "./sort";
import { createModel, fixtures, allModels } from "./test-utils";

describe("find", () => {
  describe("default sort (recency)", () => {
    it("returns models sorted by releaseDate descending", () => {
      const result = find(allModels);
      for (let i = 0; i < result.length - 1; i++) {
        const aTime = result[i].releaseDate
          ? new Date(result[i].releaseDate!).getTime()
          : 0;
        const bTime = result[i + 1].releaseDate
          ? new Date(result[i + 1].releaseDate!).getTime()
          : 0;
        expect(aTime).toBeGreaterThanOrEqual(bTime);
      }
    });
  });

  describe("sortByCost", () => {
    it("returns models sorted by input cost ascending", () => {
      const result = find(allModels, { sort: sortByCost("asc") });
      for (let i = 0; i < result.length - 1; i++) {
        const aCost = result[i].cost?.input ?? 0;
        const bCost = result[i + 1].cost?.input ?? 0;
        expect(aCost).toBeLessThanOrEqual(bCost);
      }
    });
  });

  describe("custom comparator", () => {
    it("sorts by custom function", () => {
      const result = find(allModels, {
        sort: (a, b) => b.limit.context - a.limit.context,
      });
      expect(result[0].limit.context).toBe(1_000_000); // gemini models
    });
  });

  describe("filter + sort + limit", () => {
    it("applies filter, sort, and limit together", () => {
      const result = find(allModels, {
        filter: { reasoning: true },
        sort: sortByCost("asc"),
        limit: 3,
      });
      expect(result).toHaveLength(3);
      expect(result.every((m) => m.reasoning === true)).toBe(true);
      // Sorted by cost ascending
      for (let i = 0; i < result.length - 1; i++) {
        expect(result[i].cost!.input).toBeLessThanOrEqual(result[i + 1].cost!.input);
      }
    });
  });

  describe("limit", () => {
    it("limits results", () => {
      const result = find(allModels, { limit: 3 });
      expect(result).toHaveLength(3);
    });

    it("returns all when limit exceeds count", () => {
      const result = find(allModels, { limit: 100 });
      expect(result).toHaveLength(allModels.length);
    });
  });

  describe("edge cases", () => {
    it("returns empty array for empty input", () => {
      expect(find([])).toEqual([]);
    });

    it("returns all models with no options", () => {
      expect(find(allModels)).toHaveLength(allModels.length);
    });

    it("handles models without releaseDate in default sort", () => {
      const noDate = createModel({ id: "no-date" });
      const result = find([noDate, fixtures.gpt52]);
      // gpt52 has a date, should come first
      expect(result[0].id).toBe("gpt-5-2");
      expect(result[1].id).toBe("no-date");
    });
  });
});
