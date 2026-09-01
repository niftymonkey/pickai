// Search over the whole catalog: the box, and the honest answer for models the rules cut.

interface CutMatch {
  key: string;
  name: string;
  /** The cutting rule's words, spoken by ruleLabel. */
  ruleWords: string;
}

interface CatalogSearchProps {
  query: string;
  cutMatches: CutMatch[];
  /** True when the query matches nothing in the whole catalog. */
  nothingFound: boolean;
  onQueryChange: (query: string) => void;
}

const CatalogSearch = ({ query, cutMatches, nothingFound, onQueryChange }: CatalogSearchProps) => (
  <div className="mb-3">
    <input
      type="search"
      value={query}
      onChange={(event) => onQueryChange(event.target.value)}
      placeholder="Find a model in the whole catalog"
      aria-label="Find a model in the whole catalog"
      className="w-full max-w-sm rounded-lg border border-line bg-card px-3 py-1.5 text-sm text-ink placeholder:text-ink-3"
    />
    {cutMatches.length > 0 && (
      <div className="mt-2 rounded-lg border border-line bg-card px-3 py-2">
        <p className="text-xs font-medium text-ink-2">In the catalog, but cut by your rules:</p>
        <ul className="mt-1 flex flex-col gap-0.5">
          {cutMatches.map(({ key, name, ruleWords }) => (
            <li key={key} className="text-xs text-ink">
              {name} <span className="text-ink-3">removed by</span>{" "}
              <span className="font-medium text-accent-ink">{ruleWords}</span>
            </li>
          ))}
        </ul>
      </div>
    )}
    {nothingFound && (
      <p className="mt-2 text-sm text-ink-2">No model by that name in the catalog.</p>
    )}
  </div>
);

export { CatalogSearch };
export type { CutMatch };
