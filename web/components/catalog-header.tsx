// Page header: the app name and the catalog's size, remaining-of-total once rules cut.

interface CatalogHeaderProps {
  models: number;
  listings: number;
  totalModels: number;
  totalListings: number;
}

const n = (value: number): string => value.toLocaleString("en-US");

const CatalogHeader = ({ models, listings, totalModels, totalListings }: CatalogHeaderProps) => (
  <header className="mb-6">
    <h1 className="text-2xl font-semibold tracking-tight">pickai</h1>
    <p className="mt-1 text-ink-2">
      {models === totalModels && listings === totalListings ? (
        <>
          <span className="tnum">{n(models)}</span> models across{" "}
          <span className="tnum">{n(listings)}</span> listings
        </>
      ) : (
        <>
          <span className="tnum">{n(models)}</span> of <span className="tnum">{n(totalModels)}</span>{" "}
          models, <span className="tnum">{n(listings)}</span> of{" "}
          <span className="tnum">{n(totalListings)}</span> listings
        </>
      )}
    </p>
  </header>
);

export { CatalogHeader };
