import { expect, test } from "vitest";
import type { BenchmarkSet } from "pickai";
import {
  INITIAL_SOURCE,
  fetchFailed,
  fetchLanded,
  pickSource,
  retryFetch,
} from "../source-switch";
import type { SourceState } from "../source-switch";

const aaSet: BenchmarkSet = {
  source: "Artificial Analysis via OpenRouter",
  measuredAt: "2026-09-01",
  scores: [
    {
      modelId: "gpt-4o",
      metrics: { intelligence_index: { value: 60, low: 60, high: 60, votes: undefined } },
    },
  ],
};

test("the first pick of Artificial Analysis begins the fetch and keeps LMArena on the board meanwhile", () => {
  // The consent gate is gone: the browser fetch itself is the protection, provenance is stated in the caption.
  const step = pickSource(INITIAL_SOURCE, "openrouter");
  expect(step.state).toEqual({ source: "arena", openRouter: { phase: "loading" } });
  expect(step.beginFetch).toBe(true);
});

test("a landed fetch flips the source and reports the vocabulary change", () => {
  const loading: SourceState = { source: "arena", openRouter: { phase: "loading" } };
  const step = fetchLanded(loading, aaSet);
  expect(step.state).toEqual({ source: "openrouter", openRouter: { phase: "ok", set: aaSet } });
});

test("a failed fetch keeps LMArena active and preserves the reason", () => {
  const loading: SourceState = { source: "arena", openRouter: { phase: "loading" } };
  const step = fetchFailed(loading, "HTTP 500");
  expect(step.state).toEqual({ source: "arena", openRouter: { phase: "failed", reason: "HTTP 500" } });
});

test("picking Artificial Analysis after a failure retries the fetch", () => {
  const failed: SourceState = { source: "arena", openRouter: { phase: "failed", reason: "HTTP 500" } };
  const step = pickSource(failed, "openrouter");
  expect(step.state).toEqual({ source: "arena", openRouter: { phase: "loading" } });
  expect(step.beginFetch).toBe(true);
});

test("the retry button from a failure begins the fetch the same way", () => {
  const failed: SourceState = { source: "arena", openRouter: { phase: "failed", reason: "HTTP 500" } };
  const step = retryFetch(failed);
  expect(step.state.openRouter).toEqual({ phase: "loading" });
  expect(step.beginFetch).toBe(true);
});

test("with data already in hand the switch flips instantly, both ways, and reports the change", () => {
  const cached: SourceState = { source: "arena", openRouter: { phase: "ok", set: aaSet } };
  const toAA = pickSource(cached, "openrouter");
  expect(toAA.state.source).toBe("openrouter");
  expect(toAA.beginFetch).toBe(false);
  const back = pickSource(toAA.state, "arena");
  expect(back.state.source).toBe("arena");
  expect(back.state.openRouter).toEqual({ phase: "ok", set: aaSet });
});

test("picking the source already active changes nothing", () => {
  const active: SourceState = { source: "openrouter", openRouter: { phase: "ok", set: aaSet } };
  const step = pickSource(active, "openrouter");
  expect(step.state).toEqual(active);
  expect(step.beginFetch).toBe(false);
});

test("picks during a live fetch are inert", () => {
  const loading: SourceState = { source: "arena", openRouter: { phase: "loading" } };
  expect(pickSource(loading, "openrouter").state).toEqual(loading);
  expect(retryFetch(loading).beginFetch).toBe(false);
});
