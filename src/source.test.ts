import { describe, it, expect, vi } from "vitest";
import { fromModelsDev, parseModelsDevData } from "./source";
import type { ModelsDevData } from "./source";

const sampleData: ModelsDevData = {
  anthropic: {
    name: "Anthropic",
    npm: "@ai-sdk/anthropic",
    models: {
      "claude-sonnet-4-5": {
        name: "Claude Sonnet 4.5",
        description: "Fast, intelligent model",
        input_cost: 3,
        output_cost: 15,
        cache_read: 0.3,
        cache_write: 3.75,
        context: 200_000,
        max_output: 16_000,
        input: ["text", "image"],
        output: ["text"],
        reasoning: true,
        tool_call: true,
        structured_output: true,
        family: "claude",
        knowledge: "2025-03",
        release_date: "2025-09-29",
        status: "active",
      },
    },
  },
  openai: {
    name: "OpenAI",
    npm: "@ai-sdk/openai",
    models: {
      "gpt-4o": {
        name: "GPT-4o",
        input_cost: 2.5,
        output_cost: 10,
        context: 128_000,
        max_output: 16_384,
        input: ["text", "image"],
        output: ["text"],
        tool_call: true,
        structured_output: true,
        family: "gpt",
        release_date: "2024-11-20",
        status: "active",
      },
    },
  },
};

describe("parseModelsDevData", () => {
  it("parses nested provider/model structure into flat Model[]", () => {
    const models = parseModelsDevData(sampleData);
    expect(models).toHaveLength(2);
    expect(models.map((m) => m.id).sort()).toEqual(["claude-sonnet-4-5", "gpt-4o"]);
  });

  it("converts snake_case to camelCase fields", () => {
    const models = parseModelsDevData(sampleData);
    const sonnet = models.find((m) => m.id === "claude-sonnet-4-5")!;
    expect(sonnet.toolCall).toBe(true);
    expect(sonnet.structuredOutput).toBe(true);
    expect(sonnet.openRouterId).toBe("anthropic/claude-sonnet-4.5");
    expect(sonnet.releaseDate).toBe("2025-09-29");
  });

  it("sets provider and sdk from provider entry", () => {
    const models = parseModelsDevData(sampleData);
    const sonnet = models.find((m) => m.id === "claude-sonnet-4-5")!;
    expect(sonnet.provider).toBe("anthropic");
    expect(sonnet.sdk).toBe("@ai-sdk/anthropic");
  });

  it("derives openRouterId with Anthropic dot conversion", () => {
    const models = parseModelsDevData(sampleData);
    const sonnet = models.find((m) => m.id === "claude-sonnet-4-5")!;
    expect(sonnet.openRouterId).toBe("anthropic/claude-sonnet-4.5");
  });

  it("passes through openRouterId for non-Anthropic providers", () => {
    const models = parseModelsDevData(sampleData);
    const gpt4o = models.find((m) => m.id === "gpt-4o")!;
    expect(gpt4o.openRouterId).toBe("openai/gpt-4o");
  });

  it("handles missing cost fields (model has no pricing)", () => {
    const data: ModelsDevData = {
      test: {
        models: {
          "free-model": {
            name: "Free Model",
            context: 8_000,
            max_output: 4_096,
          },
        },
      },
    };
    const models = parseModelsDevData(data);
    expect(models[0].cost).toBeUndefined();
  });

  it("handles missing optional fields", () => {
    const data: ModelsDevData = {
      test: {
        models: {
          "minimal-model": {
            name: "Minimal",
          },
        },
      },
    };
    const models = parseModelsDevData(data);
    const m = models[0];
    expect(m.id).toBe("minimal-model");
    expect(m.name).toBe("Minimal");
    expect(m.limit.context).toBe(0);
    expect(m.limit.output).toBe(0);
    expect(m.modalities.input).toEqual(["text"]);
    expect(m.modalities.output).toEqual(["text"]);
    expect(m.family).toBeUndefined();
    expect(m.knowledge).toBeUndefined();
    expect(m.reasoning).toBeUndefined();
  });

  it("parses cache pricing when present", () => {
    const models = parseModelsDevData(sampleData);
    const sonnet = models.find((m) => m.id === "claude-sonnet-4-5")!;
    expect(sonnet.cost?.cacheRead).toBe(0.3);
    expect(sonnet.cost?.cacheWrite).toBe(3.75);
  });

  it("skips providers without models", () => {
    const data: ModelsDevData = {
      empty: { name: "Empty Provider" },
      hasModels: {
        models: {
          "test-model": { name: "Test" },
        },
      },
    };
    const models = parseModelsDevData(data);
    expect(models).toHaveLength(1);
    expect(models[0].provider).toBe("hasModels");
  });

  it("uses modelId as name fallback", () => {
    const data: ModelsDevData = {
      test: {
        models: {
          "unnamed-model": {},
        },
      },
    };
    const models = parseModelsDevData(data);
    expect(models[0].name).toBe("unnamed-model");
  });
});

describe("fromModelsDev with prefetched data", () => {
  it("returns a thunk that resolves to Model[]", async () => {
    const source = fromModelsDev(sampleData);
    const models = await source();
    expect(models).toHaveLength(2);
    expect(models[0].id).toBeDefined();
  });
});

describe("fromModelsDev live fetch", () => {
  it("fetches from models.dev and parses response", async () => {
    const mockData: ModelsDevData = {
      test: {
        models: {
          "test-model": { name: "Test Model", context: 8000, max_output: 4096 },
        },
      },
    };

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(mockData), { status: 200 })
    );

    const source = fromModelsDev();
    const models = await source();
    expect(models).toHaveLength(1);
    expect(models[0].id).toBe("test-model");

    fetchSpy.mockRestore();
  });

  it("throws on non-200 response", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("Not found", { status: 404, statusText: "Not Found" })
    );

    const source = fromModelsDev();
    await expect(source()).rejects.toThrow("models.dev fetch failed: 404 Not Found");

    fetchSpy.mockRestore();
  });

  it("throws on network error", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(
      new Error("Network error")
    );

    const source = fromModelsDev();
    await expect(source()).rejects.toThrow("Network error");

    fetchSpy.mockRestore();
  });
});
