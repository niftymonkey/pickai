"use client";

// The one client driver: owns the facet state, the query, and the score source,
// runs the library, hands powers down.

import { useMemo, useState } from "react";
import { applyRules, fromOpenRouter, ruleLabel } from "pickai";
import type { ModelIdentity } from "pickai";
import { catalogCounts } from "@/core/catalog-view";
import { EMPTY_FACETS, biggestCut, changedFacet, deriveRules, facetSummary, searchModels } from "@/core/decision";
import type { FacetState } from "@/core/decision";
import {
  catalogReceipt,
  decisionSentence,
  defaultWeights,
  deltaNote,
  metricLabel,
  metricList,
  rateIdentities,
  scoreBoard,
  topKeys,
  topRows,
} from "@/core/score-view";
import type { BoardAction, DeltaNote } from "@/core/score-view";
import type { Tip } from "./info-hover";
import { INITIAL_SOURCE, fetchFailed, fetchLanded, pickSource, retryFetch } from "@/core/source-switch";
import type { ScoreSourceId, SourceState, SourceStep } from "@/core/source-switch";
import type { BenchmarkSource } from "@/lib/benchmarks";
import { BlendEditor } from "./blend-editor";
import { CatalogHeader } from "./catalog-header";
import { CatalogSearch, SearchHints } from "./catalog-search";
import { DecisionLine } from "./decision-line";
import { CatalogTable } from "./catalog-table";
import { InfoHover } from "./info-hover";
import { RuleRail } from "./rule-rail";
import type { EmptiedBy, RuleOptions } from "./rule-rail";
import type { CutCount } from "./facet-row";
import { ScoreSource, ScoreSourceNote } from "./score-source";

interface DecisionSurfaceProps {
  identities: ModelIdentity[];
  arena: BenchmarkSource;
  /** The date the catalog came down from models.dev. */
  fetchedAt: string;
}

const BLEND_TIPS: Record<ScoreSourceId, Tip> = {
  arena: {
    status: "Weights, not percentages",
    body: [
      "Each category is its own Elo rating, from the votes on that kind of prompt alone. Raising one says it matters more, and the line at the top of the page spells out the order that buys.",
    ],
  },
  openrouter: {
    status: "Weights, not percentages",
    body: [
      "Each category is its own 0-100 index, from that suite's runs alone. Raising one says it matters more, and the line at the top of the page spells out the order that buys.",
    ],
  },
};

const SOURCE_LABELS: Record<ScoreSourceId, string> = {
  arena: "LMArena",
  openrouter: "Artificial Analysis",
};

const distinctSorted = (values: string[]): string[] => [...new Set(values)].sort();

const catalogOptions = (identities: ModelIdentity[]): RuleOptions => ({
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
  // What the last move did to the top of the board. The baseline is the top ten as it
  // stood before that move, kept here because only the driver sees both boards.
  const [shift, setShift] = useState<{ top: string[]; note: DeltaNote | null; seeded: boolean }>({
    top: [],
    note: null,
    seeded: false,
  });
  const [pending, setPending] = useState<BoardAction | null>(null);

  const { source, openRouter } = sourceState;
  // A stale arena set still scores: the caption says it is old, the board stays populated.
  const arenaSet = arena.status === "unavailable" ? null : arena.set;
  const activeSet =
    source === "arena" ? arenaSet : openRouter.phase === "ok" ? openRouter.set : null;
  const weights = weightsBySource[source] ?? defaultWeights(activeSet);

  const scorable = useMemo(() => rateIdentities(identities, activeSet), [identities, activeSet]);
  const derived = useMemo(() => deriveRules(facets), [facets]);
  const rules = useMemo(() => derived.map(({ rule }) => rule), [derived]);
  const result = useMemo(() => applyRules(scorable, rules), [scorable, rules]);
  const totals = useMemo(() => catalogCounts(identities), [identities]);
  const remaining = useMemo(() => catalogCounts(result.survivors), [result]);
  const metrics = useMemo(() => metricList(activeSet), [activeSet]);
  const options = useMemo(() => catalogOptions(identities), [identities]);
  const scored = scorable.filter(({ ratings }) => ratings !== undefined).length;
  const census = catalogReceipt({
    listings: totals.listings,
    models: totals.models,
    scored,
  });

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
  // The new board is only available during render, so the note is settled here, the way
  // the rail's fence fields settle their drafts.
  if (pending !== null) {
    const action: BoardAction =
      pending.kind === "source" ? { ...pending, rated: scored } : pending;
    setShift({ top: topKeys(board.rows), note: deltaNote(action, shift.top, topRows(board.rows)), seeded: true });
    setPending(null);
  } else if (!shift.seeded && board.rows.length > 0) {
    setShift({ top: topKeys(board.rows), note: null, seeded: true });
  }
  const shownRows = searching
    ? board.rows.filter(({ key }) => survivingHitKeys.has(key))
    : board.rows;

  // The async callbacks step the machine through functional updates: the captured
  // sourceState is stale by the time the fetch settles.
  const beginBrowserFetch = () => {
    fromOpenRouter()
      .then((set) => {
        setSourceState((prev) => fetchLanded(prev, set).state);
        setPending({ kind: "source", label: SOURCE_LABELS.openrouter, rated: 0 });
      })
      .catch((error: unknown) => {
        const reason = error instanceof Error ? error.message : String(error);
        setSourceState((prev) => fetchFailed(prev, reason).state);
      });
  };

  const applyStep = (step: SourceStep) => {
    if (step.state.source !== source) {
      setPending({ kind: "source", label: SOURCE_LABELS[step.state.source], rated: 0 });
    }
    setSourceState(step.state);
    if (step.beginFetch) beginBrowserFetch();
  };

  const applyFacets = (next: FacetState) => {
    const facet = changedFacet(facets, next);
    if (facet !== null) {
      const after = facetSummary(next, facet);
      const words = after ?? facetSummary(facets, facet) ?? "";
      setPending({ kind: "rule", words, on: after !== null });
    }
    setFacets(next);
  };

  const applyWeights = (next: Record<string, number>) => {
    const moved = Object.keys(next).find((name) => next[name] !== (weights[name] ?? 0));
    if (moved !== undefined) setPending({ kind: "weight", label: metricLabel(moved) });
    setWeightsBySource({ ...weightsBySource, [source]: next });
  };

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6">
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="flex flex-col gap-5 rounded-xl bg-rail-bg p-4 lg:sticky lg:top-6">
          <RuleRail
            state={facets}
            cuts={cuts}
            options={options}
            activeRuleCount={derived.length}
            survivors={remaining.models}
            total={totals.models}
            listings={remaining.listings}
            totalListings={totals.listings}
            emptiedBy={emptiedBy}
            onChange={applyFacets}
          />
        </aside>
        <main className="min-w-0">
          <CatalogHeader />
          <DecisionLine
            sentence={decisionSentence({
              survivors: remaining.models,
              total: totals.models,
              ruleCount: derived.length,
              weights,
            })}
            note={shift.note}
          />
          {/* Both jobs are permanently visible and named: the rail is Model requirements,
              the bench is Score. The source sits beside the heading, never in a labelled
              row beneath it, and Score never folds. */}
          <section aria-labelledby="score-heading" className="mb-3">
            <div className="mb-2.5 flex flex-wrap items-center gap-x-3 gap-y-2">
              <h2 id="score-heading" className="text-[17px] font-semibold tracking-tight">
                Score
              </h2>
              <ScoreSource
                state={sourceState}
                arena={arena}
                onPick={(next) => applyStep(pickSource(sourceState, next))}
                onRetry={() => applyStep(retryFetch(sourceState))}
              />
            </div>
            <ScoreSourceNote state={sourceState} arena={arena} />
            <BlendEditor
              metrics={metrics}
              weights={weights}
              tip={BLEND_TIPS[source]}
              onChange={applyWeights}
            />
          </section>
          {/* Search first, because it is the control; the census sits right, because it is
              a receipt. No "Results" label: the table is directly below it. The box grows
              to a cap rather than to half the row, and it is the half that shrinks when
              the window narrows, so the numbers stay whole to the last moment. */}
          <div className="mt-3.5 mb-1.5 flex flex-wrap items-center gap-x-4 gap-y-2">
            <div className="min-w-[12rem] max-w-[26rem] flex-1">
              <CatalogSearch query={query} onQueryChange={setQuery} />
            </div>
            <span className="tnum ml-auto flex flex-wrap items-center gap-x-1.5 font-mono text-[11.5px] text-ink-3 sm:shrink-0">
              {census}
              <InfoHover
                label="About the catalog"
                align="right"
                tip={{
                  status: `models.dev, fetched ${fetchedAt}`,
                  body: [
                    "Every model, price and limit on this page. A listing is one model as one seller sells it; models are those listings folded by identity.",
                  ],
                }}
              />
            </span>
          </div>
          <SearchHints cutMatches={cutMatches} nothingFound={searching && hits.length === 0} />
          <CatalogTable
            rows={shownRows}
            scale={board.scale}
            emptiedBy={emptiedBy}
            searching={searching}
          />
        </main>
      </div>
    </div>
  );
};

export { DecisionSurface };
