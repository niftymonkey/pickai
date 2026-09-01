// The one place that touches the network: the models.dev catalog, loaded and grouped.

import { cache } from "react";
import { fromModelsDev, groupByModel } from "pickai";
import type { ModelIdentity } from "pickai";

type Catalog =
  | { status: "ok"; identities: ModelIdentity[]; fetchedAt: string }
  | { status: "unavailable"; reason: string };

const loadCatalog = cache(async (): Promise<Catalog> => {
  try {
    const listings = await fromModelsDev();
    return {
      status: "ok",
      identities: groupByModel(listings),
      fetchedAt: new Date().toISOString().slice(0, 10),
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.error(`catalog unavailable: ${reason}`);
    return { status: "unavailable", reason };
  }
});

export { loadCatalog };
export type { Catalog };
