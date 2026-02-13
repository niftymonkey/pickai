/**
 * ID Utilities Tests
 *
 * Ported from:
 * - ai-consensus model-availability.test.ts (normalizeModelId)
 * - ai-consensus model-routing.test.ts (resolveProvider, extractDirectModelId)
 * - ai-consensus presets.test.ts (extractVersion)
 * + new tests for matchesModel, parseModelId, toOpenRouterFormat, toDirectFormat
 */

import { describe, it, expect } from "vitest";
import {
  normalizeModelId,
  parseModelId,
  resolveProvider,
  extractDirectModelId,
  toOpenRouterFormat,
  toDirectFormat,
  matchesModel,
  extractVersion,
} from "./id";

// ---------------------------------------------------------------------------
// normalizeModelId
// ---------------------------------------------------------------------------
describe("normalizeModelId", () => {
  describe("removes provider prefix", () => {
    it("strips anthropic/ prefix", () => {
      expect(normalizeModelId("anthropic/claude-3.7-sonnet")).toBe(
        "claude-3-7-sonnet",
      );
    });

    it("strips openai/ prefix", () => {
      expect(normalizeModelId("openai/gpt-4o")).toBe("gpt-4o");
    });

    it("strips google/ prefix", () => {
      expect(normalizeModelId("google/gemini-2.0-flash")).toBe(
        "gemini-2-0-flash",
      );
    });
  });

  describe("normalizes version numbers", () => {
    it("converts dots to hyphens (4.5 -> 4-5)", () => {
      expect(normalizeModelId("claude-opus-4.5")).toBe("claude-opus-4-5");
    });

    it("handles multiple dots (3.5.1 -> 3-5-1)", () => {
      expect(normalizeModelId("model-3.5.1")).toBe("model-3-5-1");
    });
  });

  describe("removes date suffixes", () => {
    it("removes 8-digit date suffix", () => {
      expect(normalizeModelId("claude-3-7-sonnet-20250219")).toBe(
        "claude-3-7-sonnet",
      );
    });

    it("preserves model ID without date suffix", () => {
      expect(normalizeModelId("gpt-4o")).toBe("gpt-4o");
    });
  });

  describe("handles combined cases", () => {
    it("OpenRouter format with dots -> normalized", () => {
      expect(normalizeModelId("anthropic/claude-3.5-haiku")).toBe(
        "claude-3-5-haiku",
      );
    });

    it("Direct format with date -> normalized", () => {
      expect(normalizeModelId("claude-3-5-haiku-20241022")).toBe(
        "claude-3-5-haiku",
      );
    });

    it("Both formats normalize to same value", () => {
      const openRouterFormat = normalizeModelId("anthropic/claude-3.5-haiku");
      const directFormat = normalizeModelId("claude-3-5-haiku-20241022");
      expect(openRouterFormat).toBe(directFormat);
    });
  });

  describe("handles special model variants", () => {
    it("normalizes thinking variants", () => {
      expect(
        normalizeModelId("anthropic/claude-3.7-sonnet:thinking"),
      ).toBe("claude-3-7-sonnet:thinking");
    });

    it("normalizes beta variants", () => {
      expect(normalizeModelId("anthropic/claude-3.7-sonnet:beta")).toBe(
        "claude-3-7-sonnet:beta",
      );
    });
  });

  describe("lowercases for comparison", () => {
    it("lowercases the result", () => {
      expect(normalizeModelId("GPT-4O")).toBe("gpt-4o");
    });
  });
});

// ---------------------------------------------------------------------------
// extractDirectModelId
// ---------------------------------------------------------------------------
describe("extractDirectModelId", () => {
  it("extracts model ID from OpenRouter format", () => {
    expect(extractDirectModelId("openai/gpt-4o")).toBe("gpt-4o");
    expect(extractDirectModelId("anthropic/claude-3.7-sonnet")).toBe(
      "claude-3.7-sonnet",
    );
    expect(extractDirectModelId("google/gemini-2.5-flash")).toBe(
      "gemini-2.5-flash",
    );
  });

  it("returns input unchanged if already direct format (no slash)", () => {
    expect(extractDirectModelId("gpt-4o")).toBe("gpt-4o");
    expect(extractDirectModelId("claude-3.7-sonnet")).toBe(
      "claude-3.7-sonnet",
    );
  });

  it("handles nested provider paths correctly", () => {
    expect(
      extractDirectModelId("meta-llama/llama-3.1-70b-instruct"),
    ).toBe("llama-3.1-70b-instruct");
  });
});

// ---------------------------------------------------------------------------
// resolveProvider
// ---------------------------------------------------------------------------
describe("resolveProvider", () => {
  describe("from OpenRouter format (has slash)", () => {
    it("extracts provider from big 3", () => {
      expect(resolveProvider("openai/gpt-4o")).toBe("openai");
      expect(resolveProvider("anthropic/claude-3.7-sonnet")).toBe("anthropic");
      expect(resolveProvider("google/gemini-2.5-flash")).toBe("google");
    });

    it("extracts meta-llama provider", () => {
      expect(resolveProvider("meta-llama/llama-3.1-70b")).toBe("meta-llama");
      expect(resolveProvider("meta-llama/llama-4-scout")).toBe("meta-llama");
    });

    it("extracts mistralai provider", () => {
      expect(resolveProvider("mistralai/mistral-large")).toBe("mistralai");
      expect(resolveProvider("mistralai/devstral-2512")).toBe("mistralai");
    });

    it("extracts deepseek provider", () => {
      expect(resolveProvider("deepseek/deepseek-chat")).toBe("deepseek");
      expect(resolveProvider("deepseek/deepseek-v3.2")).toBe("deepseek");
    });

    it("extracts other providers", () => {
      expect(resolveProvider("qwen/qwen3-vl-32b-instruct")).toBe("qwen");
      expect(resolveProvider("x-ai/grok-4.1-fast")).toBe("x-ai");
      expect(resolveProvider("cohere/command-r-plus")).toBe("cohere");
      expect(resolveProvider("perplexity/sonar-pro-search")).toBe(
        "perplexity",
      );
      expect(resolveProvider("nvidia/llama-3.1-nemotron-70b-instruct")).toBe(
        "nvidia",
      );
      expect(resolveProvider("amazon/nova-pro-v1")).toBe("amazon");
    });

    it("handles models with :free suffix", () => {
      expect(resolveProvider("mistralai/devstral-2512:free")).toBe(
        "mistralai",
      );
    });
  });

  describe("from direct format (no slash) - infers provider", () => {
    it("infers anthropic from claude prefix", () => {
      expect(resolveProvider("claude-3.7-sonnet")).toBe("anthropic");
      expect(resolveProvider("claude-3-5-haiku-20241022")).toBe("anthropic");
      expect(resolveProvider("claude-opus-4-5")).toBe("anthropic");
    });

    it("infers openai from gpt/chatgpt/o-series prefix", () => {
      expect(resolveProvider("gpt-4o")).toBe("openai");
      expect(resolveProvider("gpt-5")).toBe("openai");
      expect(resolveProvider("chatgpt-4o-latest")).toBe("openai");
      expect(resolveProvider("o1")).toBe("openai");
      expect(resolveProvider("o3-mini")).toBe("openai");
      expect(resolveProvider("o4-mini")).toBe("openai");
    });

    it("infers google from gemini prefix", () => {
      expect(resolveProvider("gemini-2.5-flash")).toBe("google");
      expect(resolveProvider("gemini-1.5-pro")).toBe("google");
    });

    it("returns null for unknown direct format models", () => {
      expect(resolveProvider("some-unknown-model")).toBeNull();
      expect(resolveProvider("llama-3.1-70b")).toBeNull();
      expect(resolveProvider("mistral-large")).toBeNull();
    });
  });
});

// ---------------------------------------------------------------------------
// matchesModel
// ---------------------------------------------------------------------------
describe("matchesModel", () => {
  it("matches OpenRouter format to direct format", () => {
    expect(
      matchesModel(
        "anthropic/claude-3.5-haiku",
        "claude-3-5-haiku-20241022",
      ),
    ).toBe(true);
  });

  it("matches same format", () => {
    expect(matchesModel("gpt-4o", "gpt-4o")).toBe(true);
  });

  it("does not match different models", () => {
    expect(matchesModel("gpt-4o", "gpt-4o-mini")).toBe(false);
  });

  it("matches across OpenRouter dots and direct hyphens", () => {
    expect(
      matchesModel(
        "anthropic/claude-3.7-sonnet",
        "claude-3-7-sonnet-20250219",
      ),
    ).toBe(true);
  });

  it("does not match base model to variant", () => {
    expect(
      matchesModel(
        "anthropic/claude-3.7-sonnet",
        "anthropic/claude-3.7-sonnet:thinking",
      ),
    ).toBe(false);
  });

  it("matches case-insensitively", () => {
    expect(matchesModel("GPT-4O", "gpt-4o")).toBe(true);
    expect(matchesModel("Claude-Sonnet-4-5", "claude-sonnet-4-5")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// toOpenRouterFormat / toDirectFormat
// ---------------------------------------------------------------------------
describe("toOpenRouterFormat", () => {
  it("returns as-is if already in OpenRouter format", () => {
    expect(toOpenRouterFormat("openai/gpt-4o")).toBe("openai/gpt-4o");
  });

  it("prepends inferred provider for known models", () => {
    expect(toOpenRouterFormat("gpt-4o")).toBe("openai/gpt-4o");
    expect(toOpenRouterFormat("claude-3.7-sonnet")).toBe(
      "anthropic/claude-3.7-sonnet",
    );
    expect(toOpenRouterFormat("gemini-2.5-flash")).toBe(
      "google/gemini-2.5-flash",
    );
  });

  it("returns null for unknown models without provider", () => {
    expect(toOpenRouterFormat("some-unknown-model")).toBeNull();
  });
});

describe("toDirectFormat", () => {
  it("strips provider prefix", () => {
    expect(toDirectFormat("openai/gpt-4o")).toBe("gpt-4o");
    expect(toDirectFormat("anthropic/claude-3.7-sonnet")).toBe(
      "claude-3.7-sonnet",
    );
  });

  it("returns as-is if already direct format", () => {
    expect(toDirectFormat("gpt-4o")).toBe("gpt-4o");
  });
});

// ---------------------------------------------------------------------------
// parseModelId
// ---------------------------------------------------------------------------
describe("parseModelId", () => {
  it("parses OpenRouter format", () => {
    const result = parseModelId("anthropic/claude-3.7-sonnet");
    expect(result.provider).toBe("anthropic");
    expect(result.model).toBe("claude-3.7-sonnet");
  });

  it("parses direct format with inferred provider", () => {
    const result = parseModelId("gpt-4o");
    expect(result.provider).toBe("openai");
    expect(result.model).toBe("gpt-4o");
  });

  it("parses model with variant", () => {
    const result = parseModelId("anthropic/claude-3.7-sonnet:thinking");
    expect(result.provider).toBe("anthropic");
    expect(result.variant).toBe("thinking");
  });

  it("returns null provider for unknown direct models", () => {
    const result = parseModelId("some-unknown-model");
    expect(result.provider).toBeNull();
    expect(result.model).toBe("some-unknown-model");
  });

  it("parses direct format with variant (no slash, has colon)", () => {
    const result = parseModelId("claude-3-7-sonnet:thinking");
    expect(result.provider).toBe("anthropic");
    expect(result.model).toBe("claude-3-7-sonnet");
    expect(result.variant).toBe("thinking");
  });
});

// ---------------------------------------------------------------------------
// extractVersion
// ---------------------------------------------------------------------------
describe("extractVersion", () => {
  describe("Claude 4.x naming (type-version): claude-sonnet-4.5", () => {
    it("extracts version from type-version format", () => {
      expect(extractVersion("anthropic/claude-sonnet-4.5")).toBe(450);
      expect(extractVersion("anthropic/claude-opus-4.5")).toBe(450);
      expect(extractVersion("anthropic/claude-haiku-4.5")).toBe(450);
      expect(extractVersion("anthropic/claude-sonnet-4")).toBe(400);
    });
  });

  describe("Claude 3.x naming (version-type): claude-3.7-sonnet", () => {
    it("extracts version from version-type format", () => {
      expect(extractVersion("anthropic/claude-3.7-sonnet")).toBe(370);
      expect(extractVersion("anthropic/claude-3.5-sonnet")).toBe(350);
      expect(extractVersion("anthropic/claude-3.5-haiku")).toBe(350);
      expect(extractVersion("anthropic/claude-3-haiku")).toBe(300);
    });
  });

  describe("OpenAI naming: gpt-5.2, gpt-4o", () => {
    it("extracts version from gpt models", () => {
      expect(extractVersion("openai/gpt-5.2")).toBe(520);
      expect(extractVersion("openai/gpt-5.1")).toBe(510);
      expect(extractVersion("openai/gpt-5")).toBe(500);
      expect(extractVersion("openai/gpt-4o")).toBe(400);
      expect(extractVersion("openai/gpt-4o-mini")).toBe(400);
    });
  });

  describe("Google naming: gemini-2.5-pro", () => {
    it("extracts version from gemini models", () => {
      expect(extractVersion("google/gemini-2.5-pro")).toBe(250);
      expect(extractVersion("google/gemini-2.5-flash")).toBe(250);
      expect(extractVersion("google/gemini-3-pro-preview")).toBe(300);
    });
  });

  it("returns 0 for models without version numbers", () => {
    expect(extractVersion("test/some-model")).toBe(0);
  });

  it("handles o-series reasoning models", () => {
    expect(extractVersion("openai/o1-pro")).toBe(100);
    expect(extractVersion("openai/o3-mini")).toBe(300);
    expect(extractVersion("openai/o4")).toBe(400);
  });

  describe("edge cases from real catalog", () => {
    describe("date codes (should NOT match)", () => {
      it("ignores date codes like 2512, 0728", () => {
        expect(extractVersion("mistralai/devstral-2512")).toBe(0);
        expect(extractVersion("meta-llama/llama-0728-instruct")).toBe(0);
      });
    });

    describe("model size patterns", () => {
      it("ignores NxMB patterns like 8x22b, 8x7b", () => {
        expect(extractVersion("mistralai/mixtral-8x22b-instruct")).toBe(0);
        expect(extractVersion("mistralai/mixtral-8x7b")).toBe(0);
      });

      it("ignores plain size patterns like 70b, 8b", () => {
        expect(extractVersion("meta-llama/llama-70b")).toBe(0);
        expect(extractVersion("qwen/qwen-8b")).toBe(0);
      });

      it("extracts version but ignores trailing size", () => {
        expect(extractVersion("meta-llama/llama-3.1-70b-instruct")).toBe(310);
        expect(extractVersion("meta-llama/llama-3.2-8b")).toBe(320);
      });

      it("ignores decimal sizes like 3.5b (model sizes, not versions)", () => {
        expect(extractVersion("microsoft/phi-3.5b-mini")).toBe(0);
      });
    });

    describe("real-world edge cases", () => {
      it("handles models with no version", () => {
        expect(extractVersion("deepseek/deepseek-coder")).toBe(0);
        expect(extractVersion("mistralai/mistral-large")).toBe(0);
      });
    });
  });
});
