import { matchesModel } from "pickai";
import type { UiModel } from "./catalog";

/**
 * The v3 benchmark surface, shapes per design/v3-api-surface.md, fed by the
 * real LMArena dataset (lmarena-ai/leaderboard-dataset, CC BY 4.0,
 * style-controlled subset, no key). This is the prototype of the library's
 * fromArena and joinBenchmarks; learnings go to design/v3-api-findings.md.
 */

export interface MetricValue {
  value: number;
  low?: number;
  high?: number;
  votes?: number;
}

/** Arena categories offered as blendable metrics, in display order. */
export const METRIC_ORDER = [
  "overall",
  "coding",
  "math",
  "hard_prompts",
  "creative_writing",
  "instruction_following",
];

export const METRIC_LABELS: Record<string, string> = {
  overall: "Overall",
  coding: "Coding",
  math: "Math",
  hard_prompts: "Hard prompts",
  creative_writing: "Creative writing",
  instruction_following: "Instruction following",
};

export interface BenchmarkScore {
  modelId: string;
  metrics: Record<string, MetricValue>;
}

export interface BenchmarkSet {
  source: string;
  measuredAt: string;
  license?: string;
  scores: BenchmarkScore[];
}

/** One catalog model's joined rating, all rival configurations carried. */
export interface ModelRating {
  best: number;
  bestConfig: string;
  low: number;
  high: number;
  /** Range across rival configurations (equals best when only one). */
  min: number;
  max: number;
  configs: number;
  votes?: number;
}

export interface RatedModel extends UiModel {
  /** Per-metric joined ratings (arena categories). */
  metrics?: Record<string, ModelRating>;
  /** The active score shown and sorted: one metric, or the user's blend. */
  rating?: ModelRating;
  /** How many of the weighted metrics this model actually has. */
  blendUsed?: number;
  blendWanted?: number;
}

/** What the UI prints beside every score. Absent data says why it is absent. */
export interface ScoreSource {
  name: string;
  measuredAt: string;
  error?: string;
}

// ---------------------------------------------------------------------------
// Fetch
// ---------------------------------------------------------------------------

const API = "https://datasets-server.huggingface.co";
const DATASET =
  "dataset=lmarena-ai%2Fleaderboard-dataset&config=text_style_control&split=latest";

interface ArenaRow {
  row: {
    model_name: string;
    rating: number;
    rating_lower: number;
    rating_upper: number;
    vote_count: number;
    category: string;
    leaderboard_publish_date: string;
  };
}

let cached: Promise<BenchmarkSet> | undefined;

/** Fetch the style-controlled leaderboard categories, once per server process. */
export function fetchArena(): Promise<BenchmarkSet> {
  cached ??= load().catch((error) => {
    cached = undefined;
    throw error;
  });
  return cached;
}

/**
 * The /filter endpoint's index goes cold and 502s (finding 8), so category
 * fetches page the whole split via /rows: ~105 pages, parallel, one retry
 * each, cached per server process.
 */
async function fetchPage(
  offset: number,
): Promise<{ rows: ArenaRow[]; total: number }> {
  const response = await fetch(
    `${API}/rows?${DATASET}&offset=${offset}&length=100`,
    { signal: AbortSignal.timeout(20_000) },
  );
  if (!response.ok) {
    throw new Error(`arena fetch failed: ${response.status}`);
  }
  const data: { rows?: ArenaRow[]; num_rows_total?: number } =
    await response.json();
  return { rows: data.rows ?? [], total: data.num_rows_total ?? 0 };
}

async function fetchPageRetry(offset: number) {
  try {
    return await fetchPage(offset);
  } catch {
    return fetchPage(offset);
  }
}

async function fetchAllRows(): Promise<ArenaRow[]> {
  const first = await fetchPageRetry(0);
  const total = Math.min(first.total, 20_000);
  const offsets: number[] = [];
  for (let offset = 100; offset < total; offset += 100) offsets.push(offset);

  const rows = [...first.rows];
  const CHUNK = 12;
  for (let start = 0; start < offsets.length; start += CHUNK) {
    const pages = await Promise.all(
      offsets.slice(start, start + CHUNK).map(fetchPageRetry),
    );
    for (const page of pages) rows.push(...page.rows);
  }
  return rows;
}

async function load(): Promise<BenchmarkSet> {
  const byModel = new Map<string, BenchmarkScore>();
  let measuredAt = "";
  const wanted = new Set(METRIC_ORDER);

  for (const { row } of await fetchAllRows()) {
    if (!wanted.has(row.category)) continue;
    if (measuredAt === "") measuredAt = row.leaderboard_publish_date;
    let score = byModel.get(row.model_name);
    if (!score) {
      score = { modelId: row.model_name, metrics: {} };
      byModel.set(row.model_name, score);
    }
    score.metrics[row.category] = {
      value: Math.round(row.rating),
      low: Math.round(row.rating_lower),
      high: Math.round(row.rating_upper),
      votes: row.vote_count,
    };
  }

  if (byModel.size === 0) throw new Error("arena returned no rows");
  return {
    source: "LMArena",
    measuredAt,
    license: "CC BY 4.0",
    scores: [...byModel.values()],
  };
}

// ---------------------------------------------------------------------------
// Join
// ---------------------------------------------------------------------------

/** Reasoning-effort suffixes folded during the join, per decision 9.14. */
const EFFORT_SUFFIXES = ["-high", "-medium", "-low", "-minimal", "-thinking"];

function foldEffort(id: string): string {
  for (const suffix of EFFORT_SUFFIXES) {
    if (id.endsWith(suffix)) return id.slice(0, -suffix.length);
  }
  return id;
}

/**
 * Join benchmark rows to catalog models. Rival configuration ratings are all
 * carried, never averaged (decision 9.27): `best` is the top-rated real
 * configuration, `min`/`max` show the spread.
 */
export function joinBenchmarks(
  models: UiModel[],
  set: BenchmarkSet,
): RatedModel[] {
  return models.map((model) => {
    const matches = set.scores.filter((score) =>
      matchesModel(foldEffort(score.modelId), model.id),
    );
    if (matches.length === 0) return model;

    // Join every metric present in the data; nothing here knows the names.
    const names = new Set<string>();
    for (const match of matches) {
      for (const name in match.metrics) names.add(name);
    }

    const metrics: Record<string, ModelRating> = {};
    for (const name of names) {
      let best: BenchmarkScore | undefined;
      let min = Infinity;
      let max = -Infinity;
      let count = 0;
      for (const match of matches) {
        const metric = match.metrics[name];
        if (metric === undefined) continue;
        count += 1;
        if (best === undefined || metric.value > best.metrics[name].value) {
          best = match;
        }
        if (metric.value < min) min = metric.value;
        if (metric.value > max) max = metric.value;
      }
      if (best === undefined) continue;
      const metric = best.metrics[name];
      metrics[name] = {
        best: metric.value,
        bestConfig: best.modelId,
        low: metric.low ?? metric.value,
        high: metric.high ?? metric.value,
        min,
        max,
        configs: count,
        votes: metric.votes,
      };
    }
    return { ...model, metrics, rating: metrics.overall };
  });
}
