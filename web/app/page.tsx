// The catalog page: the whole models.dev catalog, handed to the client-side decision surface.

import { DecisionSurface } from "@/components/decision-surface";
import { loadCatalog } from "@/lib/catalog";
import { loadArena } from "@/lib/benchmarks";

const CatalogPage = async () => {
  const [catalog, arena] = await Promise.all([loadCatalog(), loadArena()]);
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
  return <DecisionSurface identities={catalog.identities} arena={arena} />;
};

export const revalidate = 3600;
export default CatalogPage;
