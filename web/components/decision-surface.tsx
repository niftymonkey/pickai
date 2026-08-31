"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import {
  KNOWN_MAKERS,
  blendRating,
  explainCut,
  groupModels,
  modelMaker,
  rankGroups,
  runPipeline,
  ruleLabel,
  type Rule,
  type SortAxis,
} from "@/lib/engine";
import { METRIC_ORDER } from "@/lib/benchmarks";
import { BlendEditor } from "./blend-editor";
import { flyRules } from "@/lib/fly";
import {
  parseSavedRules,
  readSavedRules,
  readSavedRulesServer,
  saveRules,
  subscribeSavedRules,
} from "@/lib/saved-rules";
import type { Preset } from "@/lib/presets";
import type { RatedModel, ScoreSource } from "@/lib/benchmarks";
import { AnimatedNumber, CountHinge } from "./count-hinge";
import { ThemeSwitcher } from "./theme-switcher";
import { PresetRow } from "./preset-row";
import { ResultsTable } from "./results-table";
import { RuleRail } from "./rule-rail";
import { Shortlist } from "./shortlist";

/** Separator-blind matching: "gpt5.5" and "GPT 5.5" both find "GPT-5.5". */
function normalizeText(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export function DecisionSurface({
  models,
  source,
}: {
  models: RatedModel[];
  source: ScoreSource;
}) {
  const [rules, setRules] = useState<Rule[]>([]);
  const [axis, setAxis] = useState<SortAxis>("score");
  const [pins, setPins] = useState<string[]>([]);
  const [lastAddedId, setLastAddedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [weights, setWeights] = useState<Record<string, number>>({
    overall: 1,
  });

  // Metric names come from the data itself, known ones ordered first, so
  // BYOD metrics would show up here with no code change.
  const availableMetrics = useMemo(() => {
    const present = new Set<string>();
    for (const model of models) {
      for (const name in model.metrics ?? {}) present.add(name);
    }
    const known = METRIC_ORDER.filter((name) => present.has(name));
    const extra = [...present]
      .filter((name) => !METRIC_ORDER.includes(name))
      .sort();
    return [...known, ...extra];
  }, [models]);

  const rated = useMemo(
    () =>
      models.map((model) => {
        const { rating, used, wanted } = blendRating(model, weights);
        return { ...model, rating, blendUsed: used, blendWanted: wanted };
      }),
    [models, weights],
  );

  const allGroups = useMemo(() => groupModels(rated), [rated]);
  const result = useMemo(
    () => runPipeline(allGroups, rules),
    [allGroups, rules],
  );
  const groups = result.survivors;
  const totalGroups = allGroups.length;

  const ranks = useMemo(() => rankGroups(groups, axis), [groups, axis]);

  const q = query.trim().toLowerCase();
  const tokens = useMemo(
    () =>
      q
        .split(/\s+/)
        .map(normalizeText)
        .filter((token) => token.length > 0),
    [q],
  );

  // Search matches any text fact, but in two tiers: the model's own identity
  // (name, id, maker) outranks incidental hits on sellers and other details,
  // so "GPT" leads with GPT models, not with everything nano-gpt resells.
  const haystacks = useMemo(() => {
    const map = new Map<string, { primary: string; all: string }>();
    for (const group of allGroups) {
      const primaryParts: string[] = [
        group.key,
        group.rep.name,
        modelMaker(group.rep) ?? "",
      ];
      const restParts: string[] = [];
      for (const seller of group.sellers) {
        primaryParts.push(seller.name, seller.id);
        restParts.push(
          seller.provider,
          seller.family ?? "",
          seller.inputModalities.join(" "),
        );
      }
      const primary = normalizeText(primaryParts.join(" "));
      map.set(group.key, {
        primary,
        all: primary + normalizeText(restParts.join(" ")),
      });
    }
    return map;
  }, [allGroups]);

  // 1 = matched the model itself, 2 = matched a seller or detail, 0 = no.
  const searchTier = useMemo(() => {
    return (key: string): number => {
      if (tokens.length === 0) return 1;
      const hay = haystacks.get(key);
      if (!hay) return 0;
      if (tokens.every((token) => hay.primary.includes(token))) return 1;
      if (tokens.every((token) => hay.all.includes(token))) return 2;
      return 0;
    };
  }, [tokens, haystacks]);

  const visibleGroups = useMemo(() => {
    if (tokens.length === 0) return groups;
    return groups.filter((group) => searchTier(group.key) > 0);
  }, [groups, tokens, searchTier]);

  const searchTiers = useMemo(() => {
    if (tokens.length === 0) return null;
    const map = new Map<string, number>();
    for (const group of visibleGroups) map.set(group.key, searchTier(group.key));
    return map;
  }, [tokens, visibleGroups, searchTier]);

  // Models matching the search that no longer survive, with the rule that
  // cut them: the honest answer to "where did my model go."
  const cutMatches = useMemo(() => {
    if (tokens.length === 0) return [];
    const survivingKeys = new Set(groups.map((group) => group.key));
    return allGroups
      .filter((group) => searchTier(group.key) > 0)
      .filter((group) => !survivingKeys.has(group.key))
      .slice(0, 5)
      .map((group) => ({ group, rule: explainCut(group, rules) }));
  }, [tokens, allGroups, groups, searchTier, rules]);

  const providers = useMemo(
    () => [...new Set(models.map((m) => m.provider))].sort(),
    [models],
  );
  const modalities = useMemo(
    () => [...new Set(models.flatMap((m) => m.inputModalities))].sort(),
    [models],
  );
  const byKey = useMemo(
    () => new Map(rated.map((m) => [m.key, m])),
    [rated],
  );
  const pinnedModels = useMemo(() => {
    const list: RatedModel[] = [];
    for (const key of pins) {
      const model = byKey.get(key);
      if (model) list.push(model);
    }
    return list;
  }, [pins, byKey]);

  const savedRaw = useSyncExternalStore(
    subscribeSavedRules,
    readSavedRules,
    readSavedRulesServer,
  );
  const saved = useMemo(() => parseSavedRules(savedRaw), [savedRaw]);

  function addRules(newRules: Rule[]) {
    if (newRules.length === 0) return;
    const next = [...rules, ...newRules];
    setRules(next);
    setLastAddedId(newRules[newRules.length - 1].id);
    saveRules(next, axis, weights);
  }

  function removeRule(id: string) {
    const next = rules.filter((rule) => rule.id !== id);
    setRules(next);
    saveRules(next, axis, weights);
  }

  function clearRules() {
    setRules([]);
  }

  function changeWeights(next: Record<string, number>) {
    setWeights(next);
    saveRules(rules, axis, next);
  }

  function applyPreset(preset: Preset, source: DOMRect) {
    const next = preset.build(() => crypto.randomUUID());
    setRules(next);
    setAxis(preset.axis);
    setLastAddedId(next.length > 0 ? next[next.length - 1].id : null);
    saveRules(next, preset.axis, weights);
    flyRules(next.map(ruleLabel), source);
  }

  function resumeSaved() {
    if (!saved) return;
    setRules(saved.rules);
    setAxis(saved.axis);
    if (saved.weights) setWeights(saved.weights);
    setLastAddedId(saved.rules[saved.rules.length - 1].id);
  }

  function togglePin(key: string) {
    setPins((current) =>
      current.includes(key)
        ? current.filter((pin) => pin !== key)
        : [...current, key],
    );
  }

  function movePin(index: number, delta: -1 | 1) {
    setPins((current) => {
      const target = index + delta;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  const biggestCutter =
    result.survivors.length === 0 && result.steps.length > 0
      ? result.steps.reduce((top, step) => (step.cut > top.cut ? step : top))
      : null;

  return (
    <div className="mx-auto max-w-[1600px] px-4 pb-24 pt-6 sm:px-6 lg:pb-6">
      <header className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1 lg:mb-6">
        <h1 className="text-xl font-bold tracking-tight text-ink lg:text-2xl">
          pickai
        </h1>
        <p className="hidden text-sm text-ink-2 sm:block">
          Filter, sort, and shortlist AI models. Every number shows its source.
        </p>
      </header>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[270px_minmax(0,1fr)]">
        <div
          id="rules-home-desktop"
          className="hidden flex-col gap-6 rounded-xl bg-rail-bg p-4 lg:sticky lg:top-6 lg:flex"
        >
          <CountHinge
            surviving={groups.length}
            total={totalGroups}
            ruleCount={rules.length}
          />
          <RuleRail
            steps={result.steps}
            providers={providers}
            makers={KNOWN_MAKERS}
            modalities={modalities}
            lastAddedId={lastAddedId}
            onAdd={addRules}
            onRemove={removeRule}
            onClearAll={clearRules}
            resumeCount={saved ? saved.rules.length : 0}
            onResume={resumeSaved}
          />
          <Shortlist models={pinnedModels} onMove={movePin} onRemove={togglePin} />
        </div>

        <main className="min-w-0">
          {rules.length === 0 && (
            <div className="mb-4">
              <PresetRow onPick={applyPreset} />
            </div>
          )}

          <div className="mb-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Find a model in your results"
              aria-label="Find a model in your results"
              className="w-full max-w-sm rounded-lg border border-line bg-card px-3 py-1.5 text-sm text-ink placeholder:text-ink-3"
            />
            <p className="text-xs text-ink-3">
              {source.error
                ? `Score: ${source.name} unavailable (${source.error})`
                : `Score: ${source.name}, ${source.measuredAt}`}
            </p>
          </div>

          {availableMetrics.length > 1 && (
            <BlendEditor
              available={availableMetrics}
              weights={weights}
              onChange={changeWeights}
            />
          )}

          {q !== "" && cutMatches.length > 0 && (
            <div className="mb-3 rounded-lg border border-line bg-card px-3 py-2">
              <p className="text-xs font-medium text-ink-2">
                In the catalog, but cut by your rules:
              </p>
              <ul className="mt-1 flex flex-col gap-0.5">
                {cutMatches.map(({ group, rule }) => (
                  <li key={group.key} className="text-xs text-ink">
                    {group.rep.name}{" "}
                    <span className="text-ink-3">removed by</span>{" "}
                    <span className="font-medium text-accent-ink">
                      {rule ? ruleLabel(rule) : "a rule on its other listings"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {q !== "" &&
            visibleGroups.length === 0 &&
            cutMatches.length === 0 && (
              <p className="mb-3 text-sm text-ink-2">
                No model by that name in the catalog.
              </p>
            )}

          {biggestCutter ? (
            <div className="rounded-xl border border-line bg-card px-4 py-6">
              <p className="text-sm font-medium text-ink">
                Your rules cut everything.
              </p>
              <p className="mt-1 text-sm text-ink-2">
                &ldquo;{ruleLabel(biggestCutter.rule)}&rdquo; cut the most (
                <span className="tnum font-mono">
                  {biggestCutter.cut.toLocaleString("en-US")}
                </span>{" "}
                models). Loosen it, or remove it.
              </p>
              <button
                type="button"
                onClick={() => removeRule(biggestCutter.rule.id)}
                className="mt-3 rounded-md border border-line px-2.5 py-1 text-xs text-ink transition-colors duration-150 hover:border-accent hover:bg-accent-soft"
              >
                Remove &ldquo;{ruleLabel(biggestCutter.rule)}&rdquo;
              </button>
            </div>
          ) : (
            <ResultsTable
              groups={visibleGroups}
              axis={axis}
              ranks={ranks}
              searchTiers={searchTiers}
              pins={pins}
              onSort={setAxis}
              onTogglePin={togglePin}
            />
          )}
        </main>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-rail-line bg-rail-bg px-4 py-2.5 lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-rail-ink">
            <span className="font-mono">
              <AnimatedNumber value={groups.length} />
            </span>{" "}
            of {totalGroups.toLocaleString("en-US")} models
          </span>
          <button
            id="rules-home-mobile"
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="rounded-md border border-rail-line px-3 py-1.5 text-sm text-rail-ink transition-colors duration-150 hover:bg-rail-hover"
          >
            Rules ({rules.length})
          </button>
        </div>
      </div>

      {drawerOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Rules and shortlist"
        >
          <button
            type="button"
            aria-label="Close rules"
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 bg-ink/40"
          />
          <div className="absolute inset-x-0 bottom-0 flex max-h-[80vh] flex-col gap-6 overflow-y-auto rounded-t-2xl bg-rail-bg p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-rail-ink">
                <span className="tnum font-mono">
                  {groups.length.toLocaleString("en-US")}
                </span>{" "}
                of {totalGroups.toLocaleString("en-US")} models pass
              </span>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="rounded-md bg-accent px-3 py-1 text-sm font-medium text-card"
              >
                Done
              </button>
            </div>
            <RuleRail
              steps={result.steps}
              providers={providers}
            makers={KNOWN_MAKERS}
              modalities={modalities}
              lastAddedId={lastAddedId}
              onAdd={addRules}
              onRemove={removeRule}
              onClearAll={clearRules}
              resumeCount={saved ? saved.rules.length : 0}
              onResume={resumeSaved}
            />
            <Shortlist
              models={pinnedModels}
              onMove={movePin}
              onRemove={togglePin}
            />
          </div>
        </div>
      )}

      <ThemeSwitcher />
    </div>
  );
}
