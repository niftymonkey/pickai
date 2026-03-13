import { describe, it, expect } from "vitest";
import { Purpose } from "./purpose";
import { recommend } from "./recommend";
import { fixtures, allModels } from "./test-utils";
import type { PurposeProfile } from "./types";

describe("Purpose profiles", () => {
  it("all profiles are valid PurposeProfile objects", () => {
    for (const [, profile] of Object.entries(Purpose)) {
      const p: PurposeProfile = profile;
      expect(p.criteria.length).toBeGreaterThan(0);
      for (const c of p.criteria) {
        expect(typeof c.criterion).toBe("function");
        expect(typeof c.weight).toBe("number");
        expect(c.weight).toBeGreaterThan(0);
      }
    }
  });

  it("has 6 built-in profiles", () => {
    expect(Object.keys(Purpose)).toHaveLength(6);
  });

  it("Coding has toolCall and structuredOutput filter", () => {
    expect(Purpose.Coding.filter).toEqual({
      toolCall: true,
      structuredOutput: true,
    });
  });

  it("Reasoning has reasoning filter", () => {
    expect(Purpose.Reasoning.filter).toEqual({ reasoning: true });
  });

  it("Cheap, Balanced, Quality, Creative have no filter", () => {
    expect(Purpose.Cheap.filter).toBeUndefined();
    expect(Purpose.Balanced.filter).toBeUndefined();
    expect(Purpose.Quality.filter).toBeUndefined();
    expect(Purpose.Creative.filter).toBeUndefined();
  });
});

describe("Purpose integration with recommend()", () => {
  it("Cheap returns cheapest model", () => {
    const result = recommend(allModels, Purpose.Cheap);
    expect(result[0].id).toBe(fixtures.flash.id);
  });

  it("Coding filters to toolCall+structuredOutput models", () => {
    const result = recommend(allModels, Purpose.Coding, { limit: 20 });
    for (const m of result) {
      expect(m.toolCall).toBe(true);
      expect(m.structuredOutput).toBe(true);
    }
    // deepseekR1 has no toolCall or structuredOutput
    expect(result.find((m) => m.id === "deepseek-r1")).toBeUndefined();
  });

  it("Reasoning filters to reasoning models", () => {
    const result = recommend(allModels, Purpose.Reasoning, { limit: 20 });
    for (const m of result) {
      expect(m.reasoning).toBe(true);
    }
  });

  it("Quality favors recent models with fresh knowledge", () => {
    const result = recommend(allModels, Purpose.Quality, { limit: 3 });
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].releaseDate).toBeDefined();
  });

  it("Balanced returns results with all criteria weighted equally", () => {
    const result = recommend(allModels, Purpose.Balanced, { limit: 5 });
    expect(result.length).toBe(5);
    for (const m of result) {
      expect(m.score).toBeGreaterThanOrEqual(0);
      expect(m.score).toBeLessThanOrEqual(1);
    }
  });

  it("Creative favors large context models", () => {
    const result = recommend(allModels, Purpose.Creative, { limit: 1 });
    // Gemini models have 1M context, should score highest on contextCapacity
    expect(["gemini-2-5-pro", "gemini-2-5-flash"]).toContain(result[0].id);
  });
});
