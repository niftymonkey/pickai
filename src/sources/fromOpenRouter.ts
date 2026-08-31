// The OpenRouter source: Artificial Analysis indices read from the keyless model list.

import type { BenchmarkScore, BenchmarkSet, MetricValue } from "../benchmarks/benchmarkSet";

/** One raw model as /api/v1/models returns it; parsed exactly once, here (parse at the edge). */
interface OpenRouterModel {
  id?: unknown;
  benchmarks?: {
    artificial_analysis?: unknown;
  };
}

const parseIndices = (indices: object, modelId: string): Record<string, MetricValue> => {
  const metrics: Record<string, MetricValue> = {};
  for (const [name, value] of Object.entries(indices) as [string, unknown][]) {
    // A null index is the source's "not scored here": an absent metric, not malformation.
    if (value === null) continue;
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new Error(`openrouter model ${modelId}: ${name} is not a finite number`);
    }
    metrics[name] = { value };
  }
  return metrics;
};

const parseOpenRouterModels = (data: unknown, measuredAt: string): BenchmarkSet => {
  const payload = data as { data?: OpenRouterModel[] };
  const scores: BenchmarkScore[] = [];
  (payload.data ?? []).forEach((model, index) => {
    const indices = model.benchmarks?.artificial_analysis;
    if (typeof indices !== "object" || indices === null) return;
    if (typeof model.id !== "string") {
      throw new Error(`openrouter model at index ${index}: id is not a string`);
    }
    const modelId = model.id;
    const score: BenchmarkScore = { modelId, metrics: parseIndices(indices, modelId) };
    // The id prefix is OpenRouter's author slug: who made the model, not who sells it.
    const slash = modelId.indexOf("/");
    if (slash > 0) score.maker = modelId.slice(0, slash);
    scores.push(score);
  });
  // The field disappearing means OpenRouter's arrangement changed; it must be loud, never zero.
  if (scores.length === 0) {
    throw new Error("openrouter payload carries no artificial_analysis data");
  }
  return {
    source: "Artificial Analysis via OpenRouter",
    measuredAt,
    scores,
  };
};

/**
 * Opt-in, off by default (decision 9.14). These numbers originate with
 * Artificial Analysis, whose terms restrict model-selection uses by their own
 * customers, and OpenRouter grants no explicit reuse right, so the choice to
 * call this is yours. Evidence: design/research/openrouter-terms.md.
 *
 * The payload carries no measurement date; `measuredAt` is the retrieval date.
 */
const fromOpenRouter = async (): Promise<BenchmarkSet> => {
  const response = await fetch("https://openrouter.ai/api/v1/models", {
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`openrouter fetch failed: HTTP ${response.status}`);
  const payload: unknown = await response.json();
  return parseOpenRouterModels(payload, new Date().toISOString().slice(0, 10));
};

export { fromOpenRouter, parseOpenRouterModels };
