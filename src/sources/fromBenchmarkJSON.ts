// BYOD entry: an unknown document either becomes a BenchmarkSet or is rejected, never guessed at.

import type { BenchmarkScore, BenchmarkSet, MetricValue } from "../benchmarks/benchmarkSet";

const reject = (path: string, expected: string): never => {
  throw new Error(`invalid benchmark JSON: ${path} must be ${expected}`);
};

const asRecord = (value: unknown, path: string): Record<string, unknown> => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    reject(path, "an object");
  }
  return value as Record<string, unknown>;
};

const asString = (value: unknown, path: string): string =>
  typeof value === "string" ? value : reject(path, "a string");

const asFiniteNumber = (value: unknown, path: string): number =>
  typeof value === "number" && Number.isFinite(value) ? value : reject(path, "a finite number");

/** A value may be a full record, a bare number, or a boolean riding as 0/1 (9.34). */
const parseMetricValue = (value: unknown, path: string): MetricValue => {
  if (typeof value === "boolean") return { value: value ? 1 : 0 };
  if (typeof value === "number") return { value: asFiniteNumber(value, path) };
  const record = asRecord(value, path);
  const metric: MetricValue = { value: asFiniteNumber(record.value, `${path}.value`) };
  if (record.low !== undefined) metric.low = asFiniteNumber(record.low, `${path}.low`);
  if (record.high !== undefined) metric.high = asFiniteNumber(record.high, `${path}.high`);
  if (record.votes !== undefined) metric.votes = asFiniteNumber(record.votes, `${path}.votes`);
  return metric;
};

const parseScore = (value: unknown, path: string): BenchmarkScore => {
  const record = asRecord(value, path);
  const score: BenchmarkScore = {
    modelId: asString(record.modelId, `${path}.modelId`),
    metrics: {},
  };
  if (record.maker !== undefined) score.maker = asString(record.maker, `${path}.maker`);
  if (record.license !== undefined) score.license = asString(record.license, `${path}.license`);
  const metrics = asRecord(record.metrics, `${path}.metrics`);
  for (const [name, metric] of Object.entries(metrics)) {
    score.metrics[name] = parseMetricValue(metric, `${path}.metrics.${name}`);
  }
  return score;
};

const fromBenchmarkJSON = (data: unknown): BenchmarkSet => {
  const record = asRecord(data, "document");
  const set: BenchmarkSet = {
    source: asString(record.source, "source"),
    measuredAt: asString(record.measuredAt, "measuredAt"),
    scores: [],
  };
  if (record.license !== undefined) set.license = asString(record.license, "license");
  const rawScores: unknown = record.scores;
  if (!Array.isArray(rawScores)) return reject("scores", "an array");
  set.scores = rawScores.map((score: unknown, index) => parseScore(score, `scores[${index}]`));
  return set;
};

export { fromBenchmarkJSON };
