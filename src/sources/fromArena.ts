// The LMArena source: the live leaderboard fetched whole and parsed into a BenchmarkSet.

import type { BenchmarkScore, BenchmarkSet, MetricValue } from "../benchmarks/benchmarkSet";

/** One raw row as datasets-server returns it; parsed exactly once, here (parse at the edge). */
interface ArenaRow {
  row: {
    model_name?: unknown;
    organization?: unknown;
    license?: unknown;
    rating?: unknown;
    rating_lower?: unknown;
    rating_upper?: unknown;
    vote_count?: unknown;
    category?: unknown;
    leaderboard_publish_date?: unknown;
  };
}

const API = "https://datasets-server.huggingface.co";
const DATASET =
  "dataset=lmarena-ai%2Fleaderboard-dataset&config=text_style_control&split=latest";
const PAGE_SIZE = 100;
const PARALLEL_PAGES = 12;
const ROW_CAP = 20_000;

const asFiniteNumber = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

const parseMetric = (raw: ArenaRow["row"], index: number): MetricValue => {
  const value = asFiniteNumber(raw.rating);
  if (value === undefined) throw new Error(`arena row ${index}: rating is not a finite number`);
  const metric: MetricValue = { value };
  const low = asFiniteNumber(raw.rating_lower);
  const high = asFiniteNumber(raw.rating_upper);
  const votes = asFiniteNumber(raw.vote_count);
  if (low !== undefined) metric.low = low;
  if (high !== undefined) metric.high = high;
  if (votes !== undefined) metric.votes = votes;
  return metric;
};

const parseArenaRows = (rows: ArenaRow[]): BenchmarkSet => {
  if (rows.length === 0) throw new Error("arena returned no rows");
  const byConfig = new Map<string, BenchmarkScore>();
  let measuredAt = "";
  rows.forEach(({ row: raw }, index) => {
    if (typeof raw.model_name !== "string") {
      throw new Error(`arena row ${index}: model_name is not a string`);
    }
    if (typeof raw.category !== "string") {
      throw new Error(`arena row ${index}: category is not a string`);
    }
    if (measuredAt === "" && typeof raw.leaderboard_publish_date === "string") {
      measuredAt = raw.leaderboard_publish_date;
    }
    let score = byConfig.get(raw.model_name);
    if (score === undefined) {
      score = { modelId: raw.model_name, metrics: {} };
      if (typeof raw.organization === "string") score.maker = raw.organization;
      if (typeof raw.license === "string") score.license = raw.license;
      byConfig.set(raw.model_name, score);
    }
    score.metrics[raw.category] = parseMetric(raw, index);
  });
  // A number without a date is not usable provenance (rule 2).
  if (measuredAt === "") throw new Error("arena rows carry no leaderboard_publish_date");
  return {
    source: "LMArena",
    measuredAt,
    license: "CC BY 4.0",
    scores: [...byConfig.values()],
  };
};

interface ArenaPage {
  rows?: ArenaRow[];
  num_rows_total?: number;
}

const fetchPage = async (offset: number): Promise<ArenaPage> => {
  const response = await fetch(
    `${API}/rows?${DATASET}&offset=${offset}&length=${PAGE_SIZE}`,
    { signal: AbortSignal.timeout(30_000) },
  );
  if (!response.ok) throw new Error(`arena fetch failed: HTTP ${response.status}`);
  const page: unknown = await response.json();
  return page as ArenaPage;
};

const fetchPageOnceRetried = async (offset: number): Promise<ArenaPage> => {
  try {
    return await fetchPage(offset);
  } catch {
    return fetchPage(offset);
  }
};

/**
 * Pages the whole split via /rows. The /filter endpoint's index goes cold and
 * 502s, so it is never used (findings 8 and 13).
 */
const fetchAllRows = async (): Promise<ArenaRow[]> => {
  const first = await fetchPageOnceRetried(0);
  const total = Math.min(first.num_rows_total ?? 0, ROW_CAP);
  const offsets: number[] = [];
  for (let offset = PAGE_SIZE; offset < total; offset += PAGE_SIZE) offsets.push(offset);

  const rows = [...(first.rows ?? [])];
  for (let start = 0; start < offsets.length; start += PARALLEL_PAGES) {
    const pages = await Promise.all(
      offsets.slice(start, start + PARALLEL_PAGES).map(fetchPageOnceRetried),
    );
    for (const page of pages) rows.push(...(page.rows ?? []));
  }
  return rows;
};

const fromArena = async (): Promise<BenchmarkSet> => parseArenaRows(await fetchAllRows());

export { fromArena, parseArenaRows };
export type { ArenaRow };
