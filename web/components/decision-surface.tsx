"use client";

// The one client driver: owns the facet state, the query, and the score source,
// runs the library, hands powers down.

import { useMemo, useState } from "react";
import { applyRules, fromOpenRouter, ruleLabel } from "pickai";
import type { ModelIdentity } from "pickai";
import { catalogCounts } from "@/core/catalog-view";
import { EMPTY_FACETS, biggestCut, deriveRules, searchModels, withoutSelection } from "@/core/decision";
import type { FacetState } from "@/core/decision";
import { defaultWeights, metricList, rateIdentities, scoreBoard } from "@/core/score-view";
import { INITIAL_SOURCE, confirmFetch, fetchFailed, fetchLanded, pickSource } from "@/core/source-switch";
import type { ScoreSourceId, SourceState, SourceStep } from "@/core/source-switch";
import type { ArenaSource } from "@/lib/benchmarks";
import { BlendEditor } from "./blend-editor";
import { CatalogHeader } from "./catalog-header";
import { CatalogSearch } from "./catalog-search";
import { CatalogTable } from "./catalog-table";
import { CountHinge } from "./count-hinge";
import { RuleRail } from "./rule-rail";
import type { EmptiedBy, RuleOptions } from "./rule-rail";
import type { CutCount } from "./facet-row";
import { ScoreSource } from "./score-source";

interface DecisionSurfaceProps {
  identities: ModelIdentity[];
  arena: ArenaSource;
  /** The date the catalog came down from models.dev. */
  fetchedAt: string;
}

const BLEND_TIPS: Record<ScoreSourceId, string> = {
  arena:
    "People vote between two models' answers on LMArena. Each category here is its own Elo rating, computed only from the votes on that kind of prompt.",
  openrouter:
    "Each Artificial Analysis category is its own 0-100 index, computed from that suite's benchmark runs.",
};

const distinctSorted = (values: string[]): string[] => [...new Set(values)].sort();

const catalogOptions = (identities: ModelIdentity[]): Omit<RuleOptions, "metrics"> => ({
  sellers: distinctSorted(
    identities.flatMap(({ listings }) => listings.map(({ provider }) => provider)),
  ),
  makers: distinctSorted(
    identities.flatMap(({ maker }) => (maker === null ? [] : [maker])),
  ),
  inputModalities: distinctSorted(
    identities.flatMap(({ representative }) => representative.modalities.input),
  ),
  outputModalities: distinctSorted(
    identities.flatMap(({ representative }) => representative.modalities.output),
  ),
});

const DecisionSurface = ({ identities, arena, fetchedAt }: DecisionSurfaceProps) => {
  const [facets, setFacets] = useState<FacetState>(EMPTY_FACETS);
  const [query, setQuery] = useState("");
  const [sourceState, setSourceState] = useState<SourceState>(INITIAL_SOURCE);
  const [weightsBySource, setWeightsBySource] = useState<
    Partial<Record<ScoreSourceId, Record<string, number>>>
  >({});

  const { source, openRouter } = sourceState;
  const activeSet =
    source === "arena"
      ? arena.status === "ok"
        ? arena.set
        : null
      : openRouter.phase === "ok"
        ? openRouter.set
        : null;
  const weights = weightsBySource[source] ?? defaultWeights(activeSet);

  const scorable = useMemo(() => rateIdentities(identities, activeSet), [identities, activeSet]);
  const derived = useMemo(() => deriveRules(facets), [facets]);
  const rules = useMemo(() => derived.map(({ rule }) => rule), [derived]);
  const result = useMemo(() => applyRules(scorable, rules), [scorable, rules]);
  const totals = useMemo(() => catalogCounts(identities), [identities]);
  const remaining = useMemo(() => catalogCounts(result.survivors), [result]);
  const metrics = useMemo(() => metricList(activeSet), [activeSet]);
  const baseOptions = useMemo(() => catalogOptions(identities), [identities]);
  const options: RuleOptions = { ...baseOptions, metrics };

  const cuts: Record<string, CutCount> = Object.fromEntries(
    derived.map(({ facet, selection }, index) => [
      `${facet}:${selection}`,
      { cutModels: result.steps[index].cutModels, cutListings: result.steps[index].cut },
    ]),
  );

  const heaviest = result.survivors.length === 0 ? biggestCut(result.steps) : undefined;
  const emptiedBy: EmptiedBy | undefined =
    heaviest === undefined
      ? undefined
      : {
          ...derived[result.steps.indexOf(heaviest)],
          label: ruleLabel(heaviest.rule),
          cutModels: heaviest.cutModels,
        };

  const hits = useMemo(
    () => searchModels(scorable, rules, query),
    [scorable, rules, query],
  );
  const searching = query.trim() !== "";
  const survivingHitKeys = new Set(
    hits.flatMap(({ identity, cutBy }) => (cutBy === undefined ? [identity.key] : [])),
  );
  const cutMatches = hits
    .flatMap(({ identity, cutBy }) =>
      cutBy === undefined
        ? []
        : [{ key: identity.key, name: identity.representative.name, ruleWords: ruleLabel(cutBy) }],
    )
    .slice(0, 5);

  const board = useMemo(() => scoreBoard(result.survivors, weights), [result, weights]);
  const shownRows = searching
    ? board.rows.filter(({ key }) => survivingHitKeys.has(key))
    : board.rows;

  // The metric vocabulary changes with the source, so an active floor cannot carry over.
  const clearFloor = () =>
    setFacets((prev) =>
      prev.metricFloor === null ? prev : withoutSelection(prev, "metricFloor", "value"),
    );

  // The async callbacks step the machine through functional updates: the captured
  // sourceState is stale by the time the fetch settles.
  const beginBrowserFetch = () => {
    fromOpenRouter()
      .then((set) => {
        setSourceState((prev) => fetchLanded(prev, set).state);
        clearFloor();
      })
      .catch((error: unknown) => {
        const reason = error instanceof Error ? error.message : String(error);
        setSourceState((prev) => fetchFailed(prev, reason).state);
      });
  };

  const applyStep = (step: SourceStep) => {
    setSourceState(step.state);
    if (step.sourceChanged) clearFloor();
    if (step.beginFetch) beginBrowserFetch();
  };

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6">
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="flex flex-col gap-5 rounded-xl bg-rail-bg p-4 lg:sticky lg:top-6">
          <CountHinge
            survivors={remaining.models}
            total={totals.models}
            listings={remaining.listings}
            totalListings={totals.listings}
            ruleCount={derived.length}
          />
          <RuleRail
            state={facets}
            cuts={cuts}
            options={options}
            activeRuleCount={derived.length}
            emptiedBy={emptiedBy}
            onChange={setFacets}
          />
        </aside>
        <main className="min-w-0">
          <CatalogHeader
            totalModels={totals.models}
            totalListings={totals.listings}
            fetchedAt={fetchedAt}
          />
          {/* The toolbar splits 50/50 at a visible separator; narrow windows stack full width.
              Top-aligned so the offer card grows downward without re-centering the row. */}
          <div className="mb-4 flex flex-col gap-3 md:grid md:grid-cols-[1fr_2px_1fr] md:items-start md:gap-x-6">
            <CatalogSearch
              query={query}
              cutMatches={cutMatches}
              nothingFound={searching && hits.length === 0}
              onQueryChange={setQuery}
            />
            <div aria-hidden className="mt-[5px] hidden h-7 bg-line-2 md:block" />
            <ScoreSource
              state={sourceState}
              arena={arena}
              onPick={(next) => applyStep(pickSource(sourceState, next))}
              onConfirmFetch={() => applyStep(confirmFetch(sourceState))}
            />
          </div>
          <BlendEditor
            metrics={metrics}
            weights={weights}
            tip={BLEND_TIPS[source]}
            onChange={(next) => setWeightsBySource({ ...weightsBySource, [source]: next })}
          />
          <CatalogTable rows={shownRows} scale={board.scale} />
        </main>
      </div>
    </div>
  );
};

export { DecisionSurface };
