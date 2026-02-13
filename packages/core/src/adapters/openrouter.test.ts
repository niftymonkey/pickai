import { describe, it, expect } from "vitest";
import { parseOpenRouterModel, parseOpenRouterCatalog } from "./openrouter";
import type { OpenRouterModel } from "./openrouter";
import { isTextFocused, classifyTier } from "../classify";
import { Tier } from "../types";
import fixture from "../__fixtures__/openrouter-models.json";

// A real model from the fixture for targeted unit tests
const claudeOpus: OpenRouterModel = fixture.data.find(
  (m) => m.id === "anthropic/claude-opus-4.6"
)! as OpenRouterModel;

const gpt4o: OpenRouterModel = fixture.data.find(
  (m) => m.id === "openai/gpt-4o"
)! as OpenRouterModel;

const flash: OpenRouterModel = fixture.data.find(
  (m) => m.id === "google/gemini-2.5-flash"
)! as OpenRouterModel;

describe("parseOpenRouterModel", () => {
  describe("ID mapping", () => {
    it("sets openRouterId as-is from the raw id", () => {
      const model = parseOpenRouterModel(claudeOpus);
      expect(model.openRouterId).toBe("anthropic/claude-opus-4.6");
    });

    it("sets apiId by stripping provider prefix", () => {
      const model = parseOpenRouterModel(claudeOpus);
      expect(model.apiId).toBe("claude-opus-4.6");
    });

    it("normalizes id (dots to hyphens, no provider)", () => {
      const model = parseOpenRouterModel(claudeOpus);
      expect(model.id).toBe("claude-opus-4-6");
    });

    it("handles model IDs without dots", () => {
      const model = parseOpenRouterModel(gpt4o);
      expect(model.id).toBe("gpt-4o");
      expect(model.apiId).toBe("gpt-4o");
      expect(model.openRouterId).toBe("openai/gpt-4o");
    });
  });

  describe("provider extraction", () => {
    it("extracts provider from the OpenRouter ID prefix", () => {
      expect(parseOpenRouterModel(claudeOpus).provider).toBe("anthropic");
      expect(parseOpenRouterModel(gpt4o).provider).toBe("openai");
      expect(parseOpenRouterModel(flash).provider).toBe("google");
    });
  });

  describe("name cleanup", () => {
    it("strips provider prefix from name", () => {
      // "Anthropic: Claude Opus 4.6" → "Claude Opus 4.6"
      expect(parseOpenRouterModel(claudeOpus).name).toBe("Claude Opus 4.6");
    });

    it("strips OpenAI prefix from name", () => {
      // "OpenAI: GPT-4o" → "GPT-4o"
      expect(parseOpenRouterModel(gpt4o).name).toBe("GPT-4o");
    });

    it("strips Google prefix from name", () => {
      expect(parseOpenRouterModel(flash).name).toBe("Gemini 2.5 Flash");
    });
  });

  describe("pricing conversion", () => {
    it("converts per-token strings to per-million numbers", () => {
      // Claude Opus 4.6: prompt "0.000005" → $5/M, completion "0.000025" → $25/M
      const model = parseOpenRouterModel(claudeOpus);
      expect(model.pricing?.input).toBe(5);
      expect(model.pricing?.output).toBe(25);
    });

    it("converts GPT-4o pricing correctly", () => {
      // prompt "0.0000025" → $2.50/M, completion "0.00001" → $10/M
      const model = parseOpenRouterModel(gpt4o);
      expect(model.pricing?.input).toBe(2.5);
      expect(model.pricing?.output).toBe(10);
    });

    it("converts sub-dollar pricing correctly", () => {
      // Gemini Flash: prompt "0.0000003" → $0.30/M
      const model = parseOpenRouterModel(flash);
      expect(model.pricing?.input).toBeCloseTo(0.3, 5);
    });

    it("handles zero pricing", () => {
      const freeModel = fixture.data.find(
        (m) => m.pricing?.prompt === "0" && m.pricing?.completion === "0"
      ) as OpenRouterModel | undefined;
      if (freeModel) {
        const model = parseOpenRouterModel(freeModel);
        expect(model.pricing?.input).toBe(0);
        expect(model.pricing?.output).toBe(0);
      }
    });
  });

  describe("context window", () => {
    it("maps context_length directly", () => {
      expect(parseOpenRouterModel(claudeOpus).contextWindow).toBe(1000000);
      expect(parseOpenRouterModel(gpt4o).contextWindow).toBe(128000);
      expect(parseOpenRouterModel(flash).contextWindow).toBe(1048576);
    });
  });

  describe("modality", () => {
    it("maps input modalities", () => {
      const model = parseOpenRouterModel(gpt4o);
      expect(model.modality?.input).toContain("text");
      expect(model.modality?.input).toContain("image");
    });

    it("maps output modalities", () => {
      const model = parseOpenRouterModel(gpt4o);
      expect(model.modality?.output).toEqual(["text"]);
    });
  });

  describe("capabilities detection", () => {
    it("detects tools from supported_parameters", () => {
      expect(parseOpenRouterModel(claudeOpus).capabilities?.tools).toBe(true);
      expect(parseOpenRouterModel(gpt4o).capabilities?.tools).toBe(true);
    });

    it("detects vision from input modalities", () => {
      expect(parseOpenRouterModel(claudeOpus).capabilities?.vision).toBe(true);
      expect(parseOpenRouterModel(gpt4o).capabilities?.vision).toBe(true);
    });

    it("detects JSON mode from response_format parameter", () => {
      expect(parseOpenRouterModel(gpt4o).capabilities?.json).toBe(true);
    });

    it("model without tools has tools: false", () => {
      const noTools = fixture.data.find(
        (m) => !m.supported_parameters?.includes("tools")
      ) as OpenRouterModel | undefined;
      if (noTools) {
        expect(parseOpenRouterModel(noTools).capabilities?.tools).toBe(false);
      }
    });

    it("text-only input model has vision: false", () => {
      const textOnly = fixture.data.find(
        (m) =>
          m.architecture.input_modalities.length === 1 &&
          m.architecture.input_modalities[0] === "text"
      ) as OpenRouterModel | undefined;
      if (textOnly) {
        expect(parseOpenRouterModel(textOnly).capabilities?.vision).toBe(false);
      }
    });
  });

  describe("created date", () => {
    it("converts unix timestamp to ISO date string", () => {
      const model = parseOpenRouterModel(claudeOpus);
      // 1770219050 = 2026-02-05 (approximately)
      expect(model.created).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("produces a valid date", () => {
      const model = parseOpenRouterModel(gpt4o);
      const date = new Date(model.created!);
      expect(date.getTime()).not.toBeNaN();
    });
  });
});

describe("parseOpenRouterCatalog", () => {
  const catalog = parseOpenRouterCatalog(fixture as { data: OpenRouterModel[] });

  it("parses all models from the fixture", () => {
    expect(catalog.length).toBe(fixture.data.length);
  });

  it("every model has required fields", () => {
    for (const m of catalog) {
      expect(m.id, `${m.openRouterId} missing id`).toBeTruthy();
      expect(m.apiId, `${m.openRouterId} missing apiId`).toBeTruthy();
      expect(m.openRouterId, `${m.openRouterId} missing openRouterId`).toBeTruthy();
      expect(m.name, `${m.openRouterId} missing name`).toBeTruthy();
      expect(m.provider, `${m.openRouterId} missing provider`).toBeTruthy();
    }
  });

  it("every model has numeric pricing", () => {
    for (const m of catalog) {
      expect(typeof m.pricing?.input).toBe("number");
      expect(typeof m.pricing?.output).toBe("number");
      expect(m.pricing!.input).toBeGreaterThanOrEqual(0);
      expect(m.pricing!.output).toBeGreaterThanOrEqual(0);
    }
  });

  it("text-focused models are correctly identified", () => {
    const textFocused = catalog.filter(isTextFocused);
    const nonTextFocused = catalog.filter((m) => !isTextFocused(m));

    // From the fixture: 334 text-only + 8 with non-text output
    expect(textFocused.length).toBeGreaterThan(300);
    expect(nonTextFocused.length).toBeGreaterThan(0);

    // Non-text models should include known image/audio generators
    const nonTextIds = nonTextFocused.map((m) => m.openRouterId);
    expect(nonTextIds).toContain("openai/gpt-5-image");
  });

  it("well-known models are classified into expected tiers", () => {
    const byId = new Map(catalog.map((m) => [m.openRouterId, m]));

    const opus = byId.get("anthropic/claude-opus-4.6")!;
    expect(classifyTier(opus)).toBe(Tier.Flagship);

    const sonnet = byId.get("anthropic/claude-sonnet-4.5")!;
    expect(classifyTier(sonnet)).toBe(Tier.Standard);

    const haiku = byId.get("anthropic/claude-haiku-4.5")!;
    expect(classifyTier(haiku)).toBe(Tier.Efficient);

    const geminiFlash = byId.get("google/gemini-2.5-flash")!;
    expect(classifyTier(geminiFlash)).toBe(Tier.Efficient);

    const geminiPro = byId.get("google/gemini-2.5-pro")!;
    expect(classifyTier(geminiPro)).toBe(Tier.Flagship);
  });

  it("multiple providers are represented", () => {
    const providers = new Set(catalog.map((m) => m.provider));
    expect(providers.size).toBeGreaterThan(10);
    expect(providers).toContain("anthropic");
    expect(providers).toContain("openai");
    expect(providers).toContain("google");
  });
});
