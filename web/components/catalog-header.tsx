// Page header: the app name and the catalog's size in both units.

interface CatalogHeaderProps {
  models: number;
  listings: number;
}

const CatalogHeader = ({ models, listings }: CatalogHeaderProps) => (
  <header className="mb-6">
    <h1 className="text-2xl font-semibold tracking-tight">pickai</h1>
    <p className="mt-1 text-ink-2">
      <span className="tnum">{models.toLocaleString("en-US")}</span> models across{" "}
      <span className="tnum">{listings.toLocaleString("en-US")}</span> listings
    </p>
  </header>
);

export { CatalogHeader };
