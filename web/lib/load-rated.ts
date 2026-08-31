import { loadCatalog } from "./catalog";
import {
  fetchArena,
  joinBenchmarks,
  type RatedModel,
  type ScoreSource,
} from "./benchmarks";

export interface RatedLoad {
  models: RatedModel[];
  source: ScoreSource;
}

/** Catalog plus live scores; on fetch failure the catalog ships unrated. */
export async function loadRated(): Promise<RatedLoad> {
  const catalog = await loadCatalog();
  try {
    const arena = await fetchArena();
    return {
      models: joinBenchmarks(catalog, arena),
      source: { name: arena.source, measuredAt: arena.measuredAt },
    };
  } catch {
    return {
      models: catalog,
      source: {
        name: "LMArena",
        measuredAt: "",
        error: "live fetch failed, scores absent this load",
      },
    };
  }
}
