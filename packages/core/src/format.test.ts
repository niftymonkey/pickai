/**
 * Format Utilities Tests
 *
 * Ported from:
 * - session-scribe model-service.test.ts (formatContextLength, formatPrice)
 * - ai-consensus openrouter-models.ts (formatCost, formatProviderName)
 * - ai-toolkit formatting.ts (formatPricing, formatContextWindow)
 */

import { describe, it, expect } from "vitest";
import {
  formatPrice,
  formatPricing,
  formatContextWindow,
  formatProviderName,
} from "./format";

// ---------------------------------------------------------------------------
// formatPrice - per-million token price display
// ---------------------------------------------------------------------------
describe("formatPrice", () => {
  it("shows Free for zero", () => {
    expect(formatPrice(0)).toBe("Free");
  });

  it("shows <$0.01/M for sub-cent prices", () => {
    expect(formatPrice(0.005)).toBe("<$0.01/M");
  });

  it("formats sub-dollar prices with two decimals", () => {
    expect(formatPrice(0.15)).toBe("$0.15/M");
    expect(formatPrice(0.05)).toBe("$0.05/M");
    expect(formatPrice(0.99)).toBe("$0.99/M");
  });

  it("formats dollar-plus prices with one decimal", () => {
    expect(formatPrice(1)).toBe("$1.0/M");
    expect(formatPrice(2.5)).toBe("$2.5/M");
    expect(formatPrice(10)).toBe("$10.0/M");
    expect(formatPrice(150)).toBe("$150.0/M");
  });

  it("handles exact boundary at $0.01 (sub-dollar, not sub-cent)", () => {
    expect(formatPrice(0.01)).toBe("$0.01/M");
  });

  it("handles exact boundary at $1.00 (dollar-plus, not sub-dollar)", () => {
    expect(formatPrice(1.0)).toBe("$1.0/M");
  });
});

// ---------------------------------------------------------------------------
// formatPricing - combined input/output pricing
// ---------------------------------------------------------------------------
describe("formatPricing", () => {
  it("shows Free when both are zero", () => {
    expect(formatPricing({ input: 0, output: 0 })).toBe("Free");
  });

  it("formats whole numbers without decimals", () => {
    expect(formatPricing({ input: 3, output: 15 })).toBe(
      "$3/$15 per 1M",
    );
  });

  it("formats decimal numbers and trims trailing zeros", () => {
    expect(formatPricing({ input: 0.25, output: 1.25 })).toBe(
      "$0.25/$1.25 per 1M",
    );
  });

  it("handles mixed zero and non-zero (free input, paid output)", () => {
    expect(formatPricing({ input: 0, output: 5 })).toBe("$0/$5 per 1M");
  });
});

// ---------------------------------------------------------------------------
// formatContextWindow - token count display
// ---------------------------------------------------------------------------
describe("formatContextWindow", () => {
  it("formats thousands as K", () => {
    expect(formatContextWindow(128000)).toBe("128K");
    expect(formatContextWindow(8000)).toBe("8K");
    expect(formatContextWindow(16000)).toBe("16K");
  });

  it("formats millions as M with one decimal", () => {
    expect(formatContextWindow(1000000)).toBe("1.0M");
    expect(formatContextWindow(2000000)).toBe("2.0M");
  });

  it("handles values just under 1M", () => {
    expect(formatContextWindow(999999)).toBe("1000K");
  });

  it("handles non-round thousands", () => {
    expect(formatContextWindow(200000)).toBe("200K");
  });

  it("handles sub-thousand values", () => {
    expect(formatContextWindow(500)).toBe("1K");
    expect(formatContextWindow(100)).toBe("0K");
  });

  it("handles zero", () => {
    expect(formatContextWindow(0)).toBe("0K");
  });
});

// ---------------------------------------------------------------------------
// formatProviderName - human-readable provider names
// ---------------------------------------------------------------------------
describe("formatProviderName", () => {
  it("maps known provider slugs to display names", () => {
    expect(formatProviderName("openai")).toBe("OpenAI");
    expect(formatProviderName("anthropic")).toBe("Anthropic");
    expect(formatProviderName("google")).toBe("Google");
    expect(formatProviderName("meta-llama")).toBe("Meta Llama");
    expect(formatProviderName("mistralai")).toBe("Mistral AI");
    expect(formatProviderName("deepseek")).toBe("DeepSeek");
    expect(formatProviderName("x-ai")).toBe("xAI");
    expect(formatProviderName("nvidia")).toBe("NVIDIA");
  });

  it("capitalizes unknown providers as fallback", () => {
    expect(formatProviderName("some-provider")).toBe("Some Provider");
    expect(formatProviderName("acme")).toBe("Acme");
  });
});
