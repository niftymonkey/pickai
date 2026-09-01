import { DIRECT_PROVIDERS } from "pickai";
import type { ModelRating, RatedModel } from "./benchmarks";

const DIRECT = new Set<string>(DIRECT_PROVIDERS);

/**
 * The client-side pipeline: rules cut, every cut is attributed, ordering is
 * the user's axis. This mocks the settled v3 explanation surface (decision
 * 9.31) until the library ships it.
 */

export type Capability =
  | "reasoning"
  | "toolCall"
  | "structuredOutput"
  | "openWeights";

export type Rule =
  | { id: string; kind: "provider"; mode: "allow" | "exclude"; providers: string[] }
  | { id: string; kind: "maker"; mode: "allow" | "exclude"; makers: string[] }
  | { id: string; kind: "capability"; capability: Capability }
  | { id: string; kind: "modality"; modality: string }
  | { id: string; kind: "minContext"; tokens: number }
  | { id: string; kind: "minOutput"; tokens: number }
  | { id: string; kind: "costFence"; side: "input" | "output"; ceiling: number };

export const CAPABILITY_LABELS: Record<Capability, string> = {
  reasoning: "reasoning",
  toolCall: "tool calling",
  structuredOutput: "structured output",
  openWeights: "open weights",
};

export function ruleLabel(rule: Rule): string {
  switch (rule.kind) {
    case "provider":
      return rule.mode === "allow"
        ? `Only ${rule.providers.join(", ")}`
        : `Never ${rule.providers.join(", ")}`;
    case "maker":
      return rule.mode === "allow"
        ? `Only made by ${rule.makers.join(", ")}`
        : `Never made by ${rule.makers.join(", ")}`;
    case "capability":
      return `Needs ${CAPABILITY_LABELS[rule.capability]}`;
    case "modality":
      return `Takes ${rule.modality} input`;
    case "minContext":
      return `Context ≥ ${fmtTokens(rule.tokens)}`;
    case "minOutput":
      return `Output ≥ ${fmtTokens(rule.tokens)}`;
    case "costFence":
      return `${rule.side === "input" ? "Input" : "Output"} ≤ $${rule.ceiling}/M`;
  }
}

/** The outlier fence cuts only known prices above the ceiling (decision 9.23). */
function passes(model: RatedModel, rule: Rule): boolean {
  switch (rule.kind) {
    case "provider":
      return rule.mode === "allow"
        ? rule.providers.includes(model.provider)
        : !rule.providers.includes(model.provider);
    case "maker": {
      // Maker is a model fact: who built it, regardless of who sells it.
      // An unknown maker survives an exclude and fails an allow.
      const maker = modelMaker(model);
      const listed = maker !== undefined && rule.makers.includes(maker);
      return rule.mode === "allow" ? listed : !listed;
    }
    case "capability":
      return model[rule.capability];
    case "modality":
      return model.inputModalities.includes(rule.modality);
    case "minContext":
      return model.context >= rule.tokens;
    case "minOutput":
      return model.output >= rule.tokens;
    case "costFence": {
      const price = rule.side === "input" ? model.costIn : model.costOut;
      return price === undefined || price <= rule.ceiling;
    }
  }
}

/**
 * Rules evaluate model identities, not listings (finding 12). Most rules test
 * the representative listing. Provider rules are the exception: they are about
 * who you will buy from, so they prune sellers, and the model dies only when
 * no acceptable seller remains.
 */
function applyRuleToGroup(group: ModelGroup, rule: Rule): ModelGroup | null {
  if (rule.kind === "provider") {
    const kept = group.sellers.filter((seller) =>
      rule.mode === "allow"
        ? rule.providers.includes(seller.provider)
        : !rule.providers.includes(seller.provider),
    );
    if (kept.length === 0) return null;
    if (kept.length === group.sellers.length) return group;
    return { key: group.key, rep: pickRep(kept), sellers: kept };
  }
  return passes(group.rep, rule) ? group : null;
}

/** The first rule that removes this model, for "where did it go" lookups. */
export function explainCut(
  group: ModelGroup,
  rules: Rule[],
): Rule | undefined {
  let current: ModelGroup | null = group;
  for (const rule of rules) {
    current = applyRuleToGroup(current, rule);
    if (current === null) return rule;
  }
  return undefined;
}

/** Counts are model counts; the model is the decision unit. */
export interface PipelineStep {
  rule: Rule;
  cut: number;
  remaining: number;
}

export interface PipelineResult {
  survivors: ModelGroup[];
  steps: PipelineStep[];
}

export function runPipeline(
  groups: ModelGroup[],
  rules: Rule[],
): PipelineResult {
  let remaining = groups;
  const steps: PipelineStep[] = [];
  for (const rule of rules) {
    const next: ModelGroup[] = [];
    for (const group of remaining) {
      const kept = applyRuleToGroup(group, rule);
      if (kept) next.push(kept);
    }
    steps.push({
      rule,
      cut: remaining.length - next.length,
      remaining: next.length,
    });
    remaining = next;
  }
  return { survivors: remaining, steps };
}

// ---------------------------------------------------------------------------
// Score blending: weights over named metrics (decision 9.32). Metric names
// are opaque here so BYOD metrics blend the same way as arena categories.
// ---------------------------------------------------------------------------

export interface BlendResult {
  rating: ModelRating | undefined;
  used: number;
  wanted: number;
}

export function blendRating(
  model: RatedModel,
  weights: Record<string, number>,
): BlendResult {
  const active = Object.entries(weights).filter(([, weight]) => weight > 0);
  const metrics = model.metrics;
  if (!metrics) return { rating: undefined, used: 0, wanted: active.length };

  const parts: { rating: ModelRating; weight: number }[] = [];
  for (const [name, weight] of active) {
    const rating = metrics[name];
    if (rating) parts.push({ rating, weight });
  }
  if (parts.length === 0) {
    return { rating: undefined, used: 0, wanted: active.length };
  }
  if (active.length === 1) {
    return { rating: parts[0].rating, used: 1, wanted: 1 };
  }

  const total = parts.reduce((sum, part) => sum + part.weight, 0);
  const blend = (pick: (rating: ModelRating) => number) =>
    Math.round(
      parts.reduce((sum, part) => sum + pick(part.rating) * part.weight, 0) /
        total,
    );
  return {
    rating: {
      best: blend((rating) => rating.best),
      bestConfig: `${parts.length} metrics`,
      low: blend((rating) => rating.low),
      high: blend((rating) => rating.high),
      min: blend((rating) => rating.min),
      max: blend((rating) => rating.max),
      configs: 1,
      votes: undefined,
    },
    used: parts.length,
    wanted: active.length,
  };
}

// ---------------------------------------------------------------------------
// Ordering
// ---------------------------------------------------------------------------

export type SortAxis =
  | "score"
  | "costIn"
  | "costOut"
  | "context"
  | "output"
  | "released"
  | "cutoff";

export const AXIS_LABELS: Record<SortAxis, string> = {
  score: "Score",
  costIn: "In $/M",
  costOut: "Out $/M",
  context: "Context",
  output: "Max out",
  released: "Released",
  cutoff: "Cutoff",
};

type Comparator = (a: RatedModel, b: RatedModel) => number;

/** Missing values sort last on every axis: unknown never ranks. */
function lastIfMissing(
  value: (m: RatedModel) => number | undefined,
  direction: 1 | -1,
): Comparator {
  return (a, b) => {
    const av = value(a);
    const bv = value(b);
    if (av === undefined && bv === undefined) return 0;
    if (av === undefined) return 1;
    if (bv === undefined) return -1;
    return (av - bv) * direction;
  };
}

const axisValues: Record<SortAxis, (m: RatedModel) => number | undefined> = {
  score: (m) => m.rating?.best,
  costIn: (m) => m.costIn,
  costOut: (m) => m.costOut,
  context: (m) => (m.context > 0 ? m.context : undefined),
  output: (m) => (m.output > 0 ? m.output : undefined),
  released: (m) => (m.releaseDate ? Date.parse(m.releaseDate) : undefined),
  cutoff: (m) => (m.knowledge ? Date.parse(m.knowledge) : undefined),
};

/** The value a model holds on an axis; undefined means it cannot rank there. */
export function axisValue(
  model: RatedModel,
  axis: SortAxis,
): number | undefined {
  return axisValues[axis](model);
}

const comparators: Record<SortAxis, Comparator> = {
  score: lastIfMissing(axisValues.score, -1),
  costIn: lastIfMissing(axisValues.costIn, 1),
  costOut: lastIfMissing(axisValues.costOut, 1),
  context: lastIfMissing(axisValues.context, -1),
  output: lastIfMissing(axisValues.output, -1),
  released: lastIfMissing(axisValues.released, -1),
  cutoff: lastIfMissing(axisValues.cutoff, -1),
};

export function sortModels(models: RatedModel[], axis: SortAxis): RatedModel[] {
  return [...models].sort(comparators[axis]);
}

// ---------------------------------------------------------------------------
// Grouping: one row per model, resellers underneath
// ---------------------------------------------------------------------------

/** One model identity with every listing that sells it. */
export interface ModelGroup {
  key: string;
  rep: RatedModel;
  sellers: RatedModel[];
}

/**
 * The maker of each model family. The library's internal inferProvider knows
 * this and is not exported (the 9.29 gap, third sighting); hand map for now.
 */
const HOME_PROVIDERS: Record<string, string> = {
  claude: "anthropic",
  gpt: "openai",
  o1: "openai",
  o3: "openai",
  o4: "openai",
  gemini: "google",
  gemma: "google",
  grok: "xai",
  llama: "meta",
  mistral: "mistral",
  magistral: "mistral",
  deepseek: "deepseek",
  qwen: "alibaba",
  glm: "zhipuai",
  kimi: "moonshotai",
  command: "cohere",
  nova: "amazon-bedrock",
  phi: "microsoft",
};

/**
 * Who built the model, regardless of who sells it (finding 3). The catalog's
 * family field is mostly absent, so the normalized id prefix is the fallback.
 */
export function modelMaker(model: RatedModel): string | undefined {
  const family = model.family?.toLowerCase();
  if (family !== undefined && HOME_PROVIDERS[family] !== undefined) {
    return HOME_PROVIDERS[family];
  }
  const key = groupKey(model);
  for (const prefix in HOME_PROVIDERS) {
    if (key.startsWith(prefix)) return HOME_PROVIDERS[prefix];
  }
  return undefined;
}

export const KNOWN_MAKERS = [...new Set(Object.values(HOME_PROVIDERS))].sort();

/**
 * Web-side stand-in for the library's internal normalizeModelId, which is not
 * exported yet (decision 9.29 makes it public in v3).
 */
function groupKey(model: RatedModel): string {
  let id = model.id.toLowerCase();
  const slash = id.lastIndexOf("/");
  if (slash >= 0) id = id.slice(slash + 1);
  id = id.replace(/[@:].*$/, "");
  id = id.replace(/\./g, "-");
  id = id.replace(/-\d{8}$/, "");
  return id;
}

/**
 * The face of a group is the model's maker when it is selling, then any
 * direct-API provider, then the cheapest known listing. Resellers are
 * footnotes, never the anchor.
 */
function pickRep(sellers: RatedModel[]): RatedModel {
  const family = sellers[0].family?.toLowerCase();
  const home = family !== undefined ? HOME_PROVIDERS[family] : undefined;
  if (home !== undefined) {
    const homeSeller = sellers.find((seller) => seller.provider === home);
    if (homeSeller) return homeSeller;
  }

  const direct = sellers.filter((seller) => DIRECT.has(seller.provider));
  const pool = direct.length > 0 ? direct : sellers;

  let cheapest: RatedModel | undefined;
  for (const seller of pool) {
    const rate = seller.costIn;
    if (rate === undefined || rate <= 0) continue;
    if (cheapest?.costIn === undefined || rate < cheapest.costIn) cheapest = seller;
  }
  return cheapest ?? pool[0];
}

export function groupModels(models: RatedModel[]): ModelGroup[] {
  const byKey = new Map<string, RatedModel[]>();
  for (const model of models) {
    const key = groupKey(model);
    const bucket = byKey.get(key);
    if (bucket) bucket.push(model);
    else byKey.set(key, [model]);
  }
  return [...byKey.entries()].map(([key, sellers]) => ({
    key,
    rep: pickRep(sellers),
    sellers,
  }));
}

export function sortGroups(groups: ModelGroup[], axis: SortAxis): ModelGroup[] {
  const compare = comparators[axis];
  return [...groups].sort((a, b) => compare(a.rep, b.rep));
}

/**
 * Rank of each group within the full rule-filtered set on the given axis, so
 * a search-narrowed row still shows where it sits in the whole list. Groups
 * with no value on the axis hold no rank.
 */
export function rankGroups(
  groups: ModelGroup[],
  axis: SortAxis,
): Map<string, number> {
  const ranks = new Map<string, number>();
  let rank = 0;
  for (const group of sortGroups(groups, axis)) {
    if (axisValue(group.rep, axis) === undefined) continue;
    rank += 1;
    ranks.set(group.key, rank);
  }
  return ranks;
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

export function fmtTokens(tokens: number): string {
  if (tokens >= 1_000_000) {
    const m = tokens / 1_000_000;
    return `${Number.isInteger(m) ? m : m.toFixed(1)}M`;
  }
  if (tokens >= 1_000) return `${Math.round(tokens / 1_000)}K`;
  return String(tokens);
}

export function fmtRate(rate: number): string {
  if (rate === 0) return "$0";
  if (rate < 0.1) return `$${rate.toFixed(3)}`;
  if (rate < 10) return `$${rate.toFixed(2)}`;
  return `$${Math.round(rate)}`;
}

/** "×1", "×2.3", "×540": division of two on-screen rates, nothing more. */
export function fmtMultiple(rate: number, cheapest: number): string {
  if (cheapest <= 0) return "";
  const times = rate / cheapest;
  if (times < 1.05) return "×1";
  if (times < 10) return `×${times.toFixed(1)}`;
  return `×${Math.round(times)}`;
}

export function cheapestKnown(
  models: RatedModel[],
  side: "costIn" | "costOut",
): number | undefined {
  let cheapest: number | undefined;
  for (const model of models) {
    const rate = model[side];
    if (rate === undefined || rate <= 0) continue;
    if (cheapest === undefined || rate < cheapest) cheapest = rate;
  }
  return cheapest;
}
