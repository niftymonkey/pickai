import { describe, expect, test } from "vitest";
import { parseOpenRouterModels } from "../fromOpenRouter";
import { fromBenchmarkJSON } from "../fromBenchmarkJSON";

// Field shapes and example values are the live payload of 2026-08-31
// (design/research/openrouter-terms.md, section 3).
const ratedModel = {
  id: "z-ai/glm-5.3-flash",
  name: "Z.ai: GLM 5.3 Flash",
  benchmarks: {
    design_arena: [],
    artificial_analysis: {
      intelligence_index: 57.5,
      coding_index: 71.5,
      agentic_index: 58.2,
    },
  },
};

describe("parseOpenRouterModels", () => {
  test("parses a rated model into one score with the three published metric names", () => {
    const set = parseOpenRouterModels({ data: [ratedModel] }, "2026-08-31");
    expect(set.scores).toHaveLength(1);
    expect(set.scores[0].metrics).toEqual({
      intelligence_index: { value: 57.5 },
      coding_index: { value: 71.5 },
      agentic_index: { value: 58.2 },
    });
  });
  test("keeps the full id as modelId and fills maker from the prefix", () => {
    const set = parseOpenRouterModels({ data: [ratedModel] }, "2026-08-31");
    expect(set.scores[0].modelId).toBe("z-ai/glm-5.3-flash");
    expect(set.scores[0].maker).toBe("z-ai");
  });
  test("skips models with no benchmarks or no artificial_analysis", () => {
    const set = parseOpenRouterModels(
      {
        data: [
          { id: "openai/gpt-oss-20b", name: "no benchmarks at all" },
          { id: "some/design-only", benchmarks: { design_arena: [{ elo: 1200 }] } },
          ratedModel,
        ],
      },
      "2026-08-31",
    );
    expect(set.scores.map((s) => s.modelId)).toEqual(["z-ai/glm-5.3-flash"]);
  });

  test("carries only the keys present when one index is missing", () => {
    const set = parseOpenRouterModels(
      { data: [{ id: "a/b", benchmarks: { artificial_analysis: { coding_index: 40 } } }] },
      "2026-08-31",
    );
    expect(set.scores[0].metrics).toEqual({ coding_index: { value: 40 } });
  });
  test("throws a named error when no model carries artificial_analysis data", () => {
    expect(() =>
      parseOpenRouterModels({ data: [{ id: "openai/gpt-oss-20b" }] }, "2026-08-31"),
    ).toThrow("openrouter payload carries no artificial_analysis data");
  });

  // Live payload fact (2026-08-31): 32 index values are null, the source's "not scored here".
  test("treats a null index as absent, not malformed", () => {
    const graniteIndices = { intelligence_index: null, coding_index: 9.5, agentic_index: null };
    const set = parseOpenRouterModels(
      { data: [{ id: "ibm-granite/granite-4.1-8b", benchmarks: { artificial_analysis: graniteIndices } }] },
      "2026-08-31",
    );
    expect(set.scores[0].metrics).toEqual({ coding_index: { value: 9.5 } });
  });

  test("throws naming the model when an index is not a finite number", () => {
    expect(() =>
      parseOpenRouterModels(
        { data: [{ id: "a/b", benchmarks: { artificial_analysis: { coding_index: "high" } } }] },
        "2026-08-31",
      ),
    ).toThrow("a/b: coding_index is not a finite number");
  });
  test("passes source and measuredAt through", () => {
    const set = parseOpenRouterModels({ data: [ratedModel] }, "2026-08-31");
    expect(set.source).toBe("Artificial Analysis via OpenRouter");
    expect(set.measuredAt).toBe("2026-08-31");
  });
  test("throws naming the position when a rated model has no string id", () => {
    expect(() =>
      parseOpenRouterModels(
        { data: [{ benchmarks: { artificial_analysis: { coding_index: 40 } } }] },
        "2026-08-31",
      ),
    ).toThrow("openrouter model at index 0: id is not a string");
  });

  // The 9.26 replay path: a saved payload must rejoin identically after a round-trip.
  test("round-trips through fromBenchmarkJSON identically", () => {
    const set = parseOpenRouterModels({ data: [ratedModel] }, "2026-08-31");
    const replayed = fromBenchmarkJSON(JSON.parse(JSON.stringify(set)));
    expect(replayed).toEqual(set);
  });
});
