import { describe, it, expect } from "vitest";
import { sortByCost, sortByRecency, sortByContext, sortByOutput } from "./sort";
import { createModel } from "./test-utils";

const cheap = createModel({ id: "cheap", cost: { input: 1, output: 2 } });
const mid = createModel({ id: "mid", cost: { input: 5, output: 10 } });
const expensive = createModel({ id: "expensive", cost: { input: 15, output: 30 } });
const noCost = createModel({ id: "no-cost", cost: null as any });
const smallCtx = createModel({ id: "small", limit: { context: 8_000, output: 4_000 } });
const bigCtx = createModel({ id: "big", limit: { context: 1_000_000, output: 65_000 } });
const old = createModel({ id: "old", releaseDate: "2023-01-01" });
const recent = createModel({ id: "recent", releaseDate: "2025-06-01" });
const noDate = createModel({ id: "no-date" });

describe("sortByCost", () => {
  it("sorts ascending by default", () => {
    const result = [expensive, cheap, mid].sort(sortByCost());
    expect(result.map((m) => m.id)).toEqual(["cheap", "mid", "expensive"]);
  });

  it("sorts descending", () => {
    const result = [cheap, expensive, mid].sort(sortByCost("desc"));
    expect(result.map((m) => m.id)).toEqual(["expensive", "mid", "cheap"]);
  });

  it("pushes unknown cost to the end", () => {
    const result = [noCost, cheap, expensive].sort(sortByCost("asc"));
    expect(result[result.length - 1].id).toBe("no-cost");
  });
});

describe("sortByRecency", () => {
  it("sorts descending (newest first) by default", () => {
    const result = [old, recent].sort(sortByRecency());
    expect(result[0].id).toBe("recent");
  });

  it("sorts ascending (oldest first)", () => {
    const result = [recent, old].sort(sortByRecency("asc"));
    expect(result[0].id).toBe("old");
  });

  it("pushes missing dates to the end", () => {
    const result = [noDate, old, recent].sort(sortByRecency());
    expect(result[result.length - 1].id).toBe("no-date");
  });
});

describe("sortByContext", () => {
  it("sorts descending (largest first) by default", () => {
    const result = [smallCtx, bigCtx].sort(sortByContext());
    expect(result[0].id).toBe("big");
  });

  it("sorts ascending", () => {
    const result = [bigCtx, smallCtx].sort(sortByContext("asc"));
    expect(result[0].id).toBe("small");
  });
});

describe("sortByOutput", () => {
  it("sorts descending (largest first) by default", () => {
    const result = [smallCtx, bigCtx].sort(sortByOutput());
    expect(result[0].id).toBe("big");
  });

  it("sorts ascending", () => {
    const result = [bigCtx, smallCtx].sort(sortByOutput("asc"));
    expect(result[0].id).toBe("small");
  });
});
