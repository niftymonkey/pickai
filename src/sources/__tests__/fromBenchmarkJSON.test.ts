import { describe, expect, it } from "vitest";
import { fromBenchmarkJSON } from "../fromBenchmarkJSON";

const document = (extra: Record<string, unknown> = {}): Record<string, unknown> => ({
  source: "my-evals",
  measuredAt: "2026-08-31",
  scores: [{ modelId: "claude-opus-5", metrics: { ifbench: { value: 0.83 } } }],
  ...extra,
});

describe("fromBenchmarkJSON", () => {
  it("accepts a full benchmark-set document", () => {
    const set = fromBenchmarkJSON(
      document({
        license: "internal",
        scores: [
          {
            modelId: "claude-opus-5",
            maker: "anthropic",
            license: "Proprietary",
            metrics: { ifbench: { value: 0.83, low: 0.8, high: 0.86, votes: 200 } },
          },
        ],
      }),
    );
    expect(set.source).toBe("my-evals");
    expect(set.measuredAt).toBe("2026-08-31");
    expect(set.license).toBe("internal");
    expect(set.scores[0].maker).toBe("anthropic");
    expect(set.scores[0].metrics.ifbench).toEqual({ value: 0.83, low: 0.8, high: 0.86, votes: 200 });
  });

  it("accepts a bare number as a metric value", () => {
    const set = fromBenchmarkJSON(
      document({ scores: [{ modelId: "glm-4-6", metrics: { tau_banking: 87 } }] }),
    );
    expect(set.scores[0].metrics.tau_banking).toEqual({ value: 87 });
  });

  it("converts a boolean fact to a 0/1 metric", () => {
    const set = fromBenchmarkJSON(
      document({
        scores: [{ modelId: "glm-4-6", metrics: { supports_hosted_tools: true, on_prem: false } }],
      }),
    );
    expect(set.scores[0].metrics.supports_hosted_tools).toEqual({ value: 1 });
    expect(set.scores[0].metrics.on_prem).toEqual({ value: 0 });
  });

  it("rejects missing provenance, naming the field", () => {
    expect(() => fromBenchmarkJSON(document({ source: undefined }))).toThrow(/source/);
    expect(() => fromBenchmarkJSON(document({ measuredAt: undefined }))).toThrow(/measuredAt/);
    expect(() => fromBenchmarkJSON(document({ scores: undefined }))).toThrow(/scores/);
  });

  it("rejects a non-numeric metric value, naming the path", () => {
    expect(() =>
      fromBenchmarkJSON(
        document({ scores: [{ modelId: "glm-4-6", metrics: { ifbench: "high" } }] }),
      ),
    ).toThrow(/scores\[0\].metrics.ifbench/);
    expect(() =>
      fromBenchmarkJSON(
        document({ scores: [{ modelId: "glm-4-6", metrics: { ifbench: { value: "high" } } }] }),
      ),
    ).toThrow(/scores\[0\].metrics.ifbench/);
  });

  it("rejects input that is not an object", () => {
    expect(() => fromBenchmarkJSON("[]")).toThrow(/object/);
    expect(() => fromBenchmarkJSON(null)).toThrow(/object/);
  });
});
