import { expect, test, vi } from "vitest";
import type { BenchmarkSet } from "pickai";
import { servingLastGood } from "../benchmark-source";

const setOf = (measuredAt: string): BenchmarkSet => ({
  source: "LMArena",
  measuredAt,
  scores: [
    {
      modelId: "gpt-4o",
      metrics: { overall: { value: 1400, low: 1390, high: 1410, votes: 100 } },
    },
  ],
});

test("a successful fetch serves the live set", async () => {
  const load = servingLastGood(async () => setOf("2026-09-01"), vi.fn());
  await expect(load()).resolves.toEqual({ status: "ok", set: setOf("2026-09-01") });
});

test("a failure with nothing remembered reports the source unavailable", async () => {
  const load = servingLastGood(async () => {
    throw new Error("429 Too Many Requests");
  }, vi.fn());
  await expect(load()).resolves.toEqual({
    status: "unavailable",
    reason: "429 Too Many Requests",
  });
});

test("a failure after a good load serves the last good set as stale", async () => {
  let live = true;
  const load = servingLastGood(async () => {
    if (!live) throw new Error("429 Too Many Requests");
    return setOf("2026-09-01");
  }, vi.fn());
  await load();
  live = false;
  await expect(load()).resolves.toEqual({
    status: "stale",
    set: setOf("2026-09-01"),
    reason: "429 Too Many Requests",
  });
});

test("the remembered set is the newest one that loaded", async () => {
  let day = "2026-09-01";
  let live = true;
  const load = servingLastGood(async () => {
    if (!live) throw new Error("down");
    return setOf(day);
  }, vi.fn());
  await load();
  day = "2026-09-02";
  await load();
  live = false;
  const source = await load();
  expect(source).toEqual({ status: "stale", set: setOf("2026-09-02"), reason: "down" });
});

test("every failure is reported, stale or not", async () => {
  // Nothing abnormal is silent: the fallback hides the failure from the page, never from the log.
  const report = vi.fn();
  const load = servingLastGood(async () => {
    throw new Error("down");
  }, report);
  await load();
  await load();
  expect(report.mock.calls).toEqual([
    [{ status: "unavailable", reason: "down" }],
    [{ status: "unavailable", reason: "down" }],
  ]);
});

test("a report says whether the last good set stood in, so the log can tell them apart", async () => {
  const report = vi.fn();
  let live = true;
  const load = servingLastGood(async () => {
    if (!live) throw new Error("HTTP 502");
    return setOf("2026-09-01");
  }, report);
  await load();
  live = false;
  await load();
  expect(report.mock.calls).toEqual([
    [{ status: "stale", set: setOf("2026-09-01"), reason: "HTTP 502" }],
  ]);
});

test("a thrown non-error still carries a readable reason", async () => {
  const load = servingLastGood(async () => {
    throw "socket hang up";
  }, vi.fn());
  await expect(load()).resolves.toEqual({ status: "unavailable", reason: "socket hang up" });
});

test("a floor stands in for a cold process whose very first fetch fails", async () => {
  // A build worker is cold by definition, and a build that cannot reach the source
  // would otherwise prerender a page with no scores for its whole revalidate hour.
  const report = vi.fn();
  const load = servingLastGood(
    async () => {
      throw new Error("HTTP 429");
    },
    report,
    setOf("2026-09-01"),
  );
  await expect(load()).resolves.toEqual({
    status: "stale",
    set: setOf("2026-09-01"),
    reason: "HTTP 429",
  });
  expect(report).toHaveBeenCalledWith({
    status: "stale",
    set: setOf("2026-09-01"),
    reason: "HTTP 429",
  });
});

test("a live fetch replaces the floor rather than sitting behind it", async () => {
  // The floor is the oldest acceptable answer, never the preferred one.
  const load = servingLastGood(async () => setOf("2026-09-02"), vi.fn(), setOf("2026-09-01"));
  await expect(load()).resolves.toEqual({ status: "ok", set: setOf("2026-09-02") });
});
