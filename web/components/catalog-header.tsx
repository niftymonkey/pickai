// Page header: the wordmark, and the catalog's totals with their receipt behind an info hover.

import { InfoHover } from "./info-hover";

interface CatalogHeaderProps {
  totalModels: number;
  totalListings: number;
  /** The date the catalog came down from models.dev. */
  fetchedAt: string;
}

const n = (value: number): string => value.toLocaleString("en-US");

const CatalogHeader = ({ totalModels, totalListings, fetchedAt }: CatalogHeaderProps) => (
  <header className="mb-5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
    <h1 className="text-2xl font-semibold tracking-tight">pickai</h1>
    <p className="flex items-center gap-1.5 text-sm text-ink-2">
      <span>
        <span className="tnum">{n(totalModels)}</span> models &middot;{" "}
        <span className="tnum">{n(totalListings)}</span> listings
      </span>
      <InfoHover
        label="About the catalog"
        tip={`Catalog from models.dev, fetched ${fetchedAt}.`}
        align="right"
      />
    </p>
  </header>
);

export { CatalogHeader };
