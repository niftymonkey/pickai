import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { withAaSlug } from "./with-aa-slug";
import { withClassification } from "./with-classification";
import { enrich } from "./enrich";
import { parseOpenRouterCatalog } from "./adapters/openrouter";
import type { OpenRouterModel } from "./adapters/openrouter";
import { createModel } from "./test-utils";

function modelWithOpenRouterId(openRouterId: string) {
  return createModel({
    id: openRouterId.split("/").pop()!.replace(/\./g, "-").replace(/:.*/, ""),
    apiSlugs: { openRouter: openRouterId, direct: openRouterId.split("/").pop()! },
  });
}

describe("withAaSlug", () => {
  describe("slug derivation", () => {
    it("anthropic/claude-opus-4.6 -> claude-opus-4-6", () => {
      const model = modelWithOpenRouterId("anthropic/claude-opus-4.6");
      expect(withAaSlug(model).apiSlugs.artificialAnalysis).toBe("claude-opus-4-6");
    });

    it("openai/gpt-5.2-codex -> gpt-5-2-codex", () => {
      const model = modelWithOpenRouterId("openai/gpt-5.2-codex");
      expect(withAaSlug(model).apiSlugs.artificialAnalysis).toBe("gpt-5-2-codex");
    });

    it("google/gemini-2.5-flash -> gemini-2-5-flash", () => {
      const model = modelWithOpenRouterId("google/gemini-2.5-flash");
      expect(withAaSlug(model).apiSlugs.artificialAnalysis).toBe("gemini-2-5-flash");
    });

    it("openai/gpt-4o -> gpt-4o", () => {
      const model = modelWithOpenRouterId("openai/gpt-4o");
      expect(withAaSlug(model).apiSlugs.artificialAnalysis).toBe("gpt-4o");
    });

    it("strips :free suffix", () => {
      const model = modelWithOpenRouterId("stepfun/step-3.5-flash:free");
      expect(withAaSlug(model).apiSlugs.artificialAnalysis).toBe("step-3-5-flash");
    });

    it("strips :thinking suffix", () => {
      const model = modelWithOpenRouterId("anthropic/claude-sonnet-4.5:thinking");
      expect(withAaSlug(model).apiSlugs.artificialAnalysis).toBe("claude-sonnet-4-5");
    });
  });

  it("preserves all Model fields", () => {
    const model = modelWithOpenRouterId("anthropic/claude-opus-4.6");
    const result = withAaSlug(model);
    expect(result.id).toBe(model.id);
    expect(result.apiSlugs.openRouter).toBe(model.apiSlugs.openRouter);
    expect(result.apiSlugs.direct).toBe(model.apiSlugs.direct);
    expect(result.name).toBe(model.name);
    expect(result.provider).toBe(model.provider);
  });

  it("populates apiSlugs.artificialAnalysis as a string", () => {
    const model = modelWithOpenRouterId("openai/gpt-4o");
    const result = withAaSlug(model);
    expect(typeof result.apiSlugs.artificialAnalysis).toBe("string");
    expect(result.apiSlugs.artificialAnalysis.length).toBeGreaterThan(0);
  });

  describe("composability", () => {
    it("composes with enrich()", () => {
      const model = modelWithOpenRouterId("anthropic/claude-opus-4.6");
      const result = withAaSlug(enrich(model));
      expect(result.tier).toBeTruthy();
      expect(result.providerName).toBeTruthy();
      expect(result.apiSlugs.artificialAnalysis).toBe("claude-opus-4-6");
    });

    it("composes with withClassification()", () => {
      const model = modelWithOpenRouterId("openai/gpt-4o");
      const result = withAaSlug(withClassification(model));
      expect(result.tier).toBeTruthy();
      expect(result.apiSlugs.artificialAnalysis).toBe("gpt-4o");
    });

    it("composes with .map()", () => {
      const models = [
        modelWithOpenRouterId("anthropic/claude-opus-4.6"),
        modelWithOpenRouterId("openai/gpt-4o"),
      ];
      const results = models.map(withAaSlug);
      expect(results[0].apiSlugs.artificialAnalysis).toBe("claude-opus-4-6");
      expect(results[1].apiSlugs.artificialAnalysis).toBe("gpt-4o");
    });
  });

  describe("catalog coverage", () => {
    const fixture = JSON.parse(
      readFileSync(join(__dirname, "__fixtures__/openrouter-models.json"), "utf-8")
    );
    const catalog = parseOpenRouterCatalog(fixture);

    it("every fixture model gets a truthy AA slug", () => {
      for (const model of catalog) {
        const result = withAaSlug(model);
        expect(
          result.apiSlugs.artificialAnalysis,
          `${model.apiSlugs.openRouter} should have a truthy AA slug`
        ).toBeTruthy();
      }
    });
  });
});
