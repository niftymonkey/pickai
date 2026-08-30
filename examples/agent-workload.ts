/**
 * Agent Workload: Tool-Calling, Context, and Cost (No General Benchmarks)
 *
 * Most model rankings lean on general intelligence indexes built from
 * coding and math benchmarks. A conversational agent workload cares about
 * different things: does the model make reliable tool calls, does it keep
 * following instructions over long turns, how much context can it hold,
 * and what do output tokens cost.
 *
 * This example scores the full catalog on exactly those axes using
 * free-tier Artificial Analysis benchmarks (tau-banking, Terminal-Bench,
 * IFBench), dedupes reseller listings with perModel(), and reports data
 * coverage so missing benchmarks are visible instead of silently
 * scoring 0. The full catalog keeps open-weight models in the running --
 * often the cheapest capable options for agent workloads.
 *
 * One warning that comes with the full catalog: reseller price fields are
 * not normalized, and a $0.00/M listing is usually a catalog error, not a
 * free tier. Sanity-check prices against the provider's pricing page
 * before trusting a cost-weighted ranking.
 *
 * Requires an API key from artificialanalysis.ai (free tier works; set
 * ARTIFICIAL_ANALYSIS_API_KEY).
 */

import {
  fromModelsDev, recommend,
  minMaxCriterion, matchesModel, criterionCoverage,
  contextCapacity,
  perModel, normalizeOpenWeights, applyFilter,
  type Model,
} from "pickai";

const aaKey = process.env.ARTIFICIAL_ANALYSIS_API_KEY;
if (!aaKey) {
  console.error("Set ARTIFICIAL_ANALYSIS_API_KEY to run this example.");
  process.exit(1);
}

// normalizeOpenWeights resolves per-model facts across provider entries:
// if any listing of a model reports open weights, all of its listings do.
const models = normalizeOpenWeights(await fromModelsDev());

const response = await fetch(
  "https://artificialanalysis.ai/api/v2/data/llms/models",
  { headers: { "x-api-key": aaKey } },
);
if (!response.ok) throw new Error(`AA fetch failed: ${response.status}`);
const aaData = await response.json();

// Free-tier evaluations include agent-shaped benchmarks. Not every model
// has every score; coverage reporting below keeps that honest.
const benchmarks = aaData.data
  .filter((m: Record<string, unknown>) => m.evaluations)
  .map((m: Record<string, unknown>) => {
    const evals = m.evaluations as Record<string, number | null>;
    return {
      slug: m.slug as string,
      tau: evals.tau_banking ?? undefined,
      terminal: evals.terminalbench_v2_1 ?? undefined,
      ifbench: evals.ifbench ?? undefined,
    };
  });

type AgentModel = Model & { tau?: number; terminal?: number; ifbench?: number };
const agentModels: AgentModel[] = models.map((m) => {
  const match = benchmarks.find((b: { slug: string }) => matchesModel(b.slug, m.id));
  return { ...m, tau: match?.tau, terminal: match?.terminal, ifbench: match?.ifbench };
});

// Output cost matters more than input for agents: turns are long.
// invert: true keeps unknown pricing as "no data" instead of "free".
const outputCost = minMaxCriterion((m: AgentModel) => m.cost?.output, true);

const agentProfile = {
  filter: { toolCall: true },
  criteria: [
    { criterion: minMaxCriterion((m: AgentModel) => m.tau), weight: 4, label: "tool-calling (tau-banking)" },
    { criterion: minMaxCriterion((m: AgentModel) => m.terminal), weight: 3, label: "agentic tasks (Terminal-Bench)" },
    { criterion: minMaxCriterion((m: AgentModel) => m.ifbench), weight: 3, label: "instruction following (IFBench)" },
    { criterion: contextCapacity, weight: 2, label: "context" },
    { criterion: outputCost, weight: 2, label: "output cost" },
  ],
};

// Sanity-check the profile before trusting a ranking: a criterion with
// covered 0 reads a field that exists for no candidate. applyFilter with
// the profile's own filter yields the same candidate set recommend() scores
// (including its default exclusion of deprecated models).
const candidates = applyFilter(agentModels, agentProfile.filter);
console.log("Criterion coverage:");
console.table(criterionCoverage(candidates, agentProfile.criteria));

// perModel(1) collapses reseller listings: one slot per physical model.
const results = recommend(agentModels, agentProfile, {
  constraints: [perModel(1)],
  limit: 8,
});

console.log("Top agent-workload models:");
console.table(results.map((m) => ({
  Score: +m.score.toFixed(3),
  Coverage: +m.coverage.toFixed(2),
  Model: m.name,
  Provider: m.provider,
  "Open?": m.openWeights ? "yes" : "no",
  Tau: m.tau != null ? +m.tau.toFixed(2) : "-",
  Terminal: m.terminal != null ? +m.terminal.toFixed(2) : "-",
  IFBench: m.ifbench != null ? +m.ifbench.toFixed(2) : "-",
  Context: `${Math.round(m.limit.context / 1000)}k`,
  "Out $/M": m.cost?.output ?? "-",
})));
