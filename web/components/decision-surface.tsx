"use client";

// The one client driver: owns the rules and the query, runs the library, hands powers down.

import { useMemo, useState } from "react";
import { applyRules, ruleLabel } from "pickai";
import type { ModelIdentity, Rule } from "pickai";
import { catalogCounts, catalogRows } from "@/core/catalog-view";
import { addRule, biggestCut, removeRule, searchModels, updateRule } from "@/core/decision";
import type { RuleEntry } from "@/core/decision";
import { CatalogHeader } from "./catalog-header";
import { CatalogSearch } from "./catalog-search";
import { CatalogTable } from "./catalog-table";
import { CountHinge } from "./count-hinge";
import { RuleRail } from "./rule-rail";
import type { EmptiedBy, RuleCard } from "./rule-rail";
import type { RuleOptions } from "./rule-form";

interface DecisionSurfaceProps {
  identities: ModelIdentity[];
}

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

const DecisionSurface = ({ identities }: DecisionSurfaceProps) => {
  const [entries, setEntries] = useState<RuleEntry[]>([]);
  const [query, setQuery] = useState("");

  const rules = useMemo(() => entries.map(({ rule }) => rule), [entries]);
  const result = useMemo(() => applyRules(identities, rules), [identities, rules]);
  const totals = useMemo(() => catalogCounts(identities), [identities]);
  const remaining = useMemo(() => catalogCounts(result.survivors), [result]);
  const options = useMemo(() => catalogOptions(identities), [identities]);

  const cards: RuleCard[] = entries.map(({ id, rule }, index) => ({
    id,
    rule,
    label: ruleLabel(rule),
    cutModels: result.steps[index].cutModels,
    cutListings: result.steps[index].cut,
  }));

  const heaviest = result.survivors.length === 0 ? biggestCut(result.steps) : undefined;
  const emptiedBy: EmptiedBy | undefined =
    heaviest === undefined ? undefined : cards[result.steps.indexOf(heaviest)];

  const hits = useMemo(
    () => searchModels(identities, rules, query),
    [identities, rules, query],
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

  const rows = useMemo(() => catalogRows(result.survivors), [result]);
  const shownRows = searching ? rows.filter(({ key }) => survivingHitKeys.has(key)) : rows;

  const add = (rule: Rule) => setEntries((current) => addRule(current, rule));
  const update = (id: string, rule: Rule) => setEntries((current) => updateRule(current, id, rule));
  const remove = (id: string) => setEntries((current) => removeRule(current, id));
  const clearAll = () => setEntries([]);

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6">
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="flex flex-col gap-5 rounded-xl bg-rail-bg p-4 lg:sticky lg:top-6">
          <CountHinge
            survivors={remaining.models}
            total={totals.models}
            ruleCount={entries.length}
          />
          <RuleRail
            cards={cards}
            options={options}
            emptiedBy={emptiedBy}
            onAdd={add}
            onUpdate={update}
            onRemove={remove}
            onClearAll={clearAll}
          />
        </aside>
        <main className="min-w-0">
          <CatalogHeader
            models={remaining.models}
            listings={remaining.listings}
            totalModels={totals.models}
            totalListings={totals.listings}
          />
          <CatalogSearch
            query={query}
            cutMatches={cutMatches}
            nothingFound={searching && hits.length === 0}
            onQueryChange={setQuery}
          />
          <CatalogTable rows={shownRows} />
        </main>
      </div>
    </div>
  );
};

export { DecisionSurface };
