// The rules a model identity is judged by, and the words each speaks in.

type Capability = "reasoning" | "toolCall" | "structuredOutput" | "openWeights";

/** Rules over catalog facts only: every kind reads a models.dev field or the inferred maker. */
type CatalogRule =
  | { kind: "provider"; mode: "allow" | "exclude"; providers: string[] }
  | { kind: "maker"; mode: "allow" | "exclude"; makers: string[] }
  | { kind: "capability"; capability: Capability }
  | { kind: "modality"; side: "input" | "output"; modality: string }
  | { kind: "minContext"; tokens: number }
  | { kind: "minOutput"; tokens: number }
  | { kind: "costFence"; side: "input" | "output"; ceiling: number }
  | { kind: "minKnowledge"; date: string }
  | { kind: "excludeDeprecated" };

// Widens to CatalogRule | MetricRule when the benchmarks slice lands
// (Mark, 2026-08-31): rules over measured metrics stay out of the catalog set.
type Rule = CatalogRule;

const CAPABILITY_WORDS: Record<Capability, string> = {
  reasoning: "reasoning",
  toolCall: "tool calling",
  structuredOutput: "structured output",
  openWeights: "open weights",
};

const formatTokens = (tokens: number): string => {
  if (tokens >= 1_000_000 && tokens % 1_000_000 === 0) return `${tokens / 1_000_000}M`;
  if (tokens >= 1_000 && tokens % 1_000 === 0) return `${tokens / 1_000}K`;
  return tokens.toLocaleString("en-US");
};

const ruleLabel = (rule: Rule): string => {
  switch (rule.kind) {
    case "provider":
      return rule.mode === "allow"
        ? `Only sold by ${rule.providers.join(", ")}`
        : `Never sold by ${rule.providers.join(", ")}`;
    case "maker":
      return rule.mode === "allow"
        ? `Only made by ${rule.makers.join(", ")}`
        : `Never made by ${rule.makers.join(", ")}`;
    case "capability":
      return `Needs ${CAPABILITY_WORDS[rule.capability]}`;
    case "modality":
      return rule.side === "input"
        ? `Takes ${rule.modality} input`
        : `Gives ${rule.modality} output`;
    case "minContext":
      return `Context at least ${formatTokens(rule.tokens)}`;
    case "minOutput":
      return `Output at least ${formatTokens(rule.tokens)}`;
    case "costFence":
      return `${rule.side === "input" ? "Input" : "Output"} price at most $${rule.ceiling}/M`;
    case "minKnowledge":
      return `Knows the world since ${rule.date}`;
    case "excludeDeprecated":
      return "No deprecated models";
  }
};

export { ruleLabel };
export type { Rule, CatalogRule, Capability };
