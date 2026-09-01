// The catalog page: the whole models.dev catalog, one row per model identity.

import { CatalogHeader } from "@/components/catalog-header";
import { CatalogTable } from "@/components/catalog-table";
import { catalogCounts, catalogRows } from "@/core/catalog-view";
import { loadCatalog } from "@/lib/catalog";

const CatalogPage = async () => {
  const catalog = await loadCatalog();
  if (catalog.status === "unavailable") {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16">
        <h1 className="text-2xl font-semibold tracking-tight">pickai</h1>
        <p className="mt-4 text-ink-2">
          The models.dev catalog is unavailable right now: {catalog.reason}
        </p>
      </main>
    );
  }
  const { models, listings } = catalogCounts(catalog.identities);
  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <CatalogHeader models={models} listings={listings} />
      <CatalogTable rows={catalogRows(catalog.identities)} />
    </main>
  );
};

export const revalidate = 3600;
export default CatalogPage;
