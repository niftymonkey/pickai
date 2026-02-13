import { describe, it, expect, expectTypeOf } from "vitest";
import {
  classifyTier,
  classifyCostTier,
  maxTier,
  minTier,
  maxCost,
  minCost,
  supportsTools,
  supportsVision,
  isTextFocused,
} from "./classify";
import { Tier, Cost } from "./types";
import type { Model, ModelTier, CostTier } from "./types";

/** Helper to create a minimal Model for testing */
function createModel(overrides: Partial<Model> = {}): Model {
  return {
    id: overrides.id || "test-model",
    apiId: overrides.apiId || overrides.id || "test-model",
    openRouterId: overrides.openRouterId || `test/${overrides.id || "test-model"}`,
    name: overrides.name || "Test Model",
    provider: overrides.provider || "test",
    contextWindow: overrides.contextWindow ?? 128000,
    pricing: overrides.pricing ?? { input: 1, output: 2 },
    modality: overrides.modality ?? { input: ["text"], output: ["text"] },
    capabilities: overrides.capabilities ?? { tools: true },
    ...overrides,
  };
}

// ============================================
// classifyTier
// ============================================

describe("classifyTier", () => {
  describe("efficient tier", () => {
    it("classifies haiku models as efficient", () => {
      expect(classifyTier(createModel({ id: "claude-haiku-4-5", name: "Claude Haiku 4.5" }))).toBe(Tier.Efficient);
      expect(classifyTier(createModel({ id: "claude-3-5-haiku", name: "Claude 3.5 Haiku" }))).toBe(Tier.Efficient);
    });

    it("classifies mini models as efficient", () => {
      expect(classifyTier(createModel({ id: "gpt-4o-mini", name: "GPT-4o Mini" }))).toBe(Tier.Efficient);
      expect(classifyTier(createModel({ id: "gpt-5-mini", name: "GPT-5 Mini" }))).toBe(Tier.Efficient);
    });

    it("classifies nano models as efficient", () => {
      expect(classifyTier(createModel({ id: "gpt-5-nano", name: "GPT-5 Nano" }))).toBe(Tier.Efficient);
    });

    it("classifies flash models as efficient", () => {
      expect(classifyTier(createModel({ id: "gemini-2-5-flash", name: "Gemini 2.5 Flash" }))).toBe(Tier.Efficient);
    });

    it("classifies lite models as efficient", () => {
      expect(classifyTier(createModel({ id: "model-lite", name: "Model Lite" }))).toBe(Tier.Efficient);
    });

    it("classifies tiny models as efficient", () => {
      expect(classifyTier(createModel({ id: "tiny-model", name: "Tiny Model" }))).toBe(Tier.Efficient);
    });

    it("classifies small models as efficient", () => {
      expect(classifyTier(createModel({ id: "mistral-small", name: "Mistral Small" }))).toBe(Tier.Efficient);
    });

    it("does NOT classify gemini as efficient (avoid false match on 'mini')", () => {
      expect(classifyTier(createModel({ id: "gemini-2-5-pro", name: "Gemini 2.5 Pro" }))).not.toBe(Tier.Efficient);
    });
  });

  describe("flagship tier", () => {
    it("classifies opus models as flagship", () => {
      expect(classifyTier(createModel({ id: "claude-opus-4-5", name: "Claude Opus 4.5" }))).toBe(Tier.Flagship);
    });

    it("classifies ultra models as flagship", () => {
      expect(classifyTier(createModel({ id: "gemini-ultra", name: "Gemini Ultra" }))).toBe(Tier.Flagship);
    });

    it("classifies pro models as flagship", () => {
      expect(classifyTier(createModel({ id: "gpt-5-2-pro", name: "GPT-5.2 Pro" }))).toBe(Tier.Flagship);
      expect(classifyTier(createModel({ id: "gemini-2-5-pro", name: "Gemini 2.5 Pro" }))).toBe(Tier.Flagship);
    });

    it("classifies high-cost models (>= $10/M input) as flagship", () => {
      expect(classifyTier(createModel({
        id: "expensive-model",
        name: "Expensive Model",
        pricing: { input: 15, output: 75 },
      }))).toBe(Tier.Flagship);
    });

    it("classifies o1-pro as flagship", () => {
      expect(classifyTier(createModel({ id: "o1-pro", name: "O1 Pro" }))).toBe(Tier.Flagship);
    });
  });

  describe("standard tier", () => {
    it("classifies sonnet models as standard", () => {
      expect(classifyTier(createModel({ id: "claude-sonnet-4-5", name: "Claude Sonnet 4.5" }))).toBe(Tier.Standard);
      expect(classifyTier(createModel({ id: "claude-3-7-sonnet", name: "Claude 3.7 Sonnet" }))).toBe(Tier.Standard);
    });

    it("classifies gpt-4o as standard", () => {
      expect(classifyTier(createModel({ id: "gpt-4o", name: "GPT-4o", pricing: { input: 2.5, output: 10 } }))).toBe(Tier.Standard);
    });

    it("classifies gpt-5.2 (non-pro) as standard", () => {
      expect(classifyTier(createModel({ id: "gpt-5-2", name: "GPT-5.2", pricing: { input: 5, output: 15 } }))).toBe(Tier.Standard);
    });
  });
});

// ============================================
// classifyCostTier
// ============================================

describe("classifyCostTier", () => {
  it("classifies free models", () => {
    expect(classifyCostTier(createModel({ pricing: { input: 0, output: 0 } }))).toBe(Cost.Free);
  });

  it("classifies budget models (input < $2/M)", () => {
    expect(classifyCostTier(createModel({ pricing: { input: 0.15, output: 0.6 } }))).toBe(Cost.Budget);
    expect(classifyCostTier(createModel({ pricing: { input: 1, output: 5 } }))).toBe(Cost.Budget);
    expect(classifyCostTier(createModel({ pricing: { input: 1.99, output: 5 } }))).toBe(Cost.Budget);
  });

  it("classifies standard models ($2 - $10/M)", () => {
    expect(classifyCostTier(createModel({ pricing: { input: 2.5, output: 10 } }))).toBe(Cost.Standard);
    expect(classifyCostTier(createModel({ pricing: { input: 3, output: 15 } }))).toBe(Cost.Standard);
    expect(classifyCostTier(createModel({ pricing: { input: 5, output: 25 } }))).toBe(Cost.Standard);
    expect(classifyCostTier(createModel({ pricing: { input: 9.99, output: 30 } }))).toBe(Cost.Standard);
  });

  it("classifies premium models ($10 - $20/M)", () => {
    expect(classifyCostTier(createModel({ pricing: { input: 10, output: 30 } }))).toBe(Cost.Premium);
    expect(classifyCostTier(createModel({ pricing: { input: 15, output: 75 } }))).toBe(Cost.Premium);
    expect(classifyCostTier(createModel({ pricing: { input: 19.99, output: 60 } }))).toBe(Cost.Premium);
  });

  it("classifies ultra models (>= $20/M)", () => {
    expect(classifyCostTier(createModel({ pricing: { input: 20, output: 80 } }))).toBe(Cost.Ultra);
    expect(classifyCostTier(createModel({ pricing: { input: 21, output: 168 } }))).toBe(Cost.Ultra);
    expect(classifyCostTier(createModel({ pricing: { input: 150, output: 600 } }))).toBe(Cost.Ultra);
  });

  it("treats models without pricing as free", () => {
    expect(classifyCostTier(createModel({ pricing: undefined }))).toBe(Cost.Free);
  });
});

// ============================================
// Ordinal helpers
// ============================================

describe("maxTier", () => {
  const efficient = createModel({ id: "claude-haiku-4-5", name: "Claude Haiku 4.5" });
  const standard = createModel({ id: "claude-sonnet-4-5", name: "Claude Sonnet 4.5" });
  const flagship = createModel({ id: "claude-opus-4-5", name: "Claude Opus 4.5" });

  it("maxTier(Efficient) includes only efficient", () => {
    const filter = maxTier(Tier.Efficient);
    expect(filter(efficient)).toBe(true);
    expect(filter(standard)).toBe(false);
    expect(filter(flagship)).toBe(false);
  });

  it("maxTier(Standard) includes efficient + standard", () => {
    const filter = maxTier(Tier.Standard);
    expect(filter(efficient)).toBe(true);
    expect(filter(standard)).toBe(true);
    expect(filter(flagship)).toBe(false);
  });

  it("maxTier(Flagship) includes all", () => {
    const filter = maxTier(Tier.Flagship);
    expect(filter(efficient)).toBe(true);
    expect(filter(standard)).toBe(true);
    expect(filter(flagship)).toBe(true);
  });
});

describe("minTier", () => {
  const efficient = createModel({ id: "claude-haiku-4-5", name: "Claude Haiku 4.5" });
  const standard = createModel({ id: "claude-sonnet-4-5", name: "Claude Sonnet 4.5" });
  const flagship = createModel({ id: "claude-opus-4-5", name: "Claude Opus 4.5" });

  it("minTier(Flagship) includes only flagship", () => {
    const filter = minTier(Tier.Flagship);
    expect(filter(efficient)).toBe(false);
    expect(filter(standard)).toBe(false);
    expect(filter(flagship)).toBe(true);
  });

  it("minTier(Standard) includes standard + flagship", () => {
    const filter = minTier(Tier.Standard);
    expect(filter(efficient)).toBe(false);
    expect(filter(standard)).toBe(true);
    expect(filter(flagship)).toBe(true);
  });

  it("minTier(Efficient) includes all", () => {
    const filter = minTier(Tier.Efficient);
    expect(filter(efficient)).toBe(true);
    expect(filter(standard)).toBe(true);
    expect(filter(flagship)).toBe(true);
  });
});

describe("maxCost", () => {
  const free = createModel({ pricing: { input: 0, output: 0 } });
  const budget = createModel({ pricing: { input: 1, output: 5 } });
  const standard = createModel({ pricing: { input: 3, output: 15 } });
  const premium = createModel({ pricing: { input: 15, output: 75 } });
  const ultra = createModel({ pricing: { input: 150, output: 600 } });

  it("maxCost(Budget) includes free + budget", () => {
    const filter = maxCost(Cost.Budget);
    expect(filter(free)).toBe(true);
    expect(filter(budget)).toBe(true);
    expect(filter(standard)).toBe(false);
    expect(filter(premium)).toBe(false);
    expect(filter(ultra)).toBe(false);
  });

  it("maxCost(Standard) includes free + budget + standard", () => {
    const filter = maxCost(Cost.Standard);
    expect(filter(free)).toBe(true);
    expect(filter(budget)).toBe(true);
    expect(filter(standard)).toBe(true);
    expect(filter(premium)).toBe(false);
    expect(filter(ultra)).toBe(false);
  });

  it("maxCost(Premium) excludes only ultra", () => {
    const filter = maxCost(Cost.Premium);
    expect(filter(free)).toBe(true);
    expect(filter(budget)).toBe(true);
    expect(filter(standard)).toBe(true);
    expect(filter(premium)).toBe(true);
    expect(filter(ultra)).toBe(false);
  });
});

describe("minCost", () => {
  const free = createModel({ pricing: { input: 0, output: 0 } });
  const budget = createModel({ pricing: { input: 1, output: 5 } });
  const standard = createModel({ pricing: { input: 3, output: 15 } });
  const premium = createModel({ pricing: { input: 15, output: 75 } });
  const ultra = createModel({ pricing: { input: 150, output: 600 } });

  it("minCost(Premium) includes premium + ultra", () => {
    const filter = minCost(Cost.Premium);
    expect(filter(free)).toBe(false);
    expect(filter(budget)).toBe(false);
    expect(filter(standard)).toBe(false);
    expect(filter(premium)).toBe(true);
    expect(filter(ultra)).toBe(true);
  });

  it("minCost(Free) includes all", () => {
    const filter = minCost(Cost.Free);
    expect(filter(free)).toBe(true);
    expect(filter(budget)).toBe(true);
    expect(filter(standard)).toBe(true);
    expect(filter(premium)).toBe(true);
    expect(filter(ultra)).toBe(true);
  });
});

describe("ordinal helpers with .filter()", () => {
  const models = [
    createModel({ id: "claude-haiku-4-5", name: "Claude Haiku 4.5", pricing: { input: 1, output: 5 } }),
    createModel({ id: "claude-sonnet-4-5", name: "Claude Sonnet 4.5", pricing: { input: 3, output: 15 } }),
    createModel({ id: "claude-opus-4-5", name: "Claude Opus 4.5", pricing: { input: 15, output: 75 } }),
    createModel({ id: "gpt-4o-mini", name: "GPT-4o Mini", pricing: { input: 0.15, output: 0.6 } }),
    createModel({ id: "o1-pro", name: "O1 Pro", pricing: { input: 150, output: 600 } }),
  ];

  it("filters affordable models (cost <= standard)", () => {
    const affordable = models.filter(maxCost(Cost.Standard));
    expect(affordable).toHaveLength(3);
    expect(affordable.map(m => m.id)).toEqual(["claude-haiku-4-5", "claude-sonnet-4-5", "gpt-4o-mini"]);
  });

  it("filters capable models (tier >= standard)", () => {
    const capable = models.filter(minTier(Tier.Standard));
    expect(capable).toHaveLength(3);
    expect(capable.map(m => m.id)).toEqual(["claude-sonnet-4-5", "claude-opus-4-5", "o1-pro"]);
  });

  it("combines predicates for affordable + capable", () => {
    const sweet = models.filter(m => maxCost(Cost.Standard)(m) && minTier(Tier.Standard)(m));
    expect(sweet).toHaveLength(1);
    expect(sweet[0].id).toBe("claude-sonnet-4-5");
  });
});

// ============================================
// Type safety: ModelTier and CostTier are incompatible
// ============================================

describe("branded type safety", () => {
  it("ModelTier and CostTier are distinct types", () => {
    expectTypeOf(Tier.Standard).toEqualTypeOf<ModelTier>();
    expectTypeOf(Cost.Standard).toEqualTypeOf<CostTier>();
    expectTypeOf(Tier.Standard).not.toEqualTypeOf<CostTier>();
    expectTypeOf(Cost.Standard).not.toEqualTypeOf<ModelTier>();
  });

  it("classifyTier returns ModelTier, not CostTier", () => {
    expectTypeOf(classifyTier).returns.toEqualTypeOf<ModelTier>();
    expectTypeOf(classifyTier).returns.not.toEqualTypeOf<CostTier>();
  });

  it("classifyCostTier returns CostTier, not ModelTier", () => {
    expectTypeOf(classifyCostTier).returns.toEqualTypeOf<CostTier>();
    expectTypeOf(classifyCostTier).returns.not.toEqualTypeOf<ModelTier>();
  });
});

// ============================================
// supportsTools
// ============================================

describe("supportsTools", () => {
  it("returns true when capabilities.tools is true", () => {
    expect(supportsTools(createModel({ capabilities: { tools: true } }))).toBe(true);
  });

  it("returns false when capabilities.tools is false", () => {
    expect(supportsTools(createModel({ capabilities: { tools: false } }))).toBe(false);
  });

  it("returns false when capabilities is undefined", () => {
    expect(supportsTools(createModel({ capabilities: undefined }))).toBe(false);
  });

  it("returns false when tools is not specified", () => {
    expect(supportsTools(createModel({ capabilities: { vision: true } }))).toBe(false);
  });
});

// ============================================
// supportsVision
// ============================================

describe("supportsVision", () => {
  it("returns true when capabilities.vision is true", () => {
    expect(supportsVision(createModel({ capabilities: { vision: true } }))).toBe(true);
  });

  it("returns true when input modalities include image", () => {
    expect(supportsVision(createModel({
      capabilities: {},
      modality: { input: ["text", "image"], output: ["text"] },
    }))).toBe(true);
  });

  it("returns false when neither vision capability nor image modality", () => {
    expect(supportsVision(createModel({
      capabilities: { vision: false },
      modality: { input: ["text"], output: ["text"] },
    }))).toBe(false);
  });

  it("returns false when capabilities and modality are undefined", () => {
    expect(supportsVision(createModel({ capabilities: undefined, modality: undefined }))).toBe(false);
  });
});

// ============================================
// isTextFocused
// ============================================

describe("isTextFocused", () => {
  it("returns true for text-only output models", () => {
    expect(isTextFocused(createModel({ modality: { input: ["text"], output: ["text"] } }))).toBe(true);
  });

  it("returns true for models that accept image input but output text only", () => {
    expect(isTextFocused(createModel({
      modality: { input: ["text", "image"], output: ["text"] },
    }))).toBe(true);
  });

  it("returns false for image output models", () => {
    expect(isTextFocused(createModel({
      modality: { input: ["text"], output: ["text", "image"] },
    }))).toBe(false);
  });

  it("returns false for audio output models", () => {
    expect(isTextFocused(createModel({
      modality: { input: ["text"], output: ["text", "audio"] },
    }))).toBe(false);
  });

  it("returns false for video output models", () => {
    expect(isTextFocused(createModel({
      modality: { input: ["text"], output: ["text", "video"] },
    }))).toBe(false);
  });

  it("returns true when modality is undefined (assume text)", () => {
    expect(isTextFocused(createModel({ modality: undefined }))).toBe(true);
  });
});
