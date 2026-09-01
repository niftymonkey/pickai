import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

const SRC = join(__dirname, "..");
const SOURCES = join(SRC, "sources");
const IMPORT_SPECIFIER = /from\s+"([^"]+)"/g;

const productionFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      return entry.name === "__tests__" || path === SOURCES ? [] : productionFiles(path);
    }
    return entry.isFile() && entry.name.endsWith(".ts") ? [path] : [];
  });

describe("production code outside sources", () => {
  it("never imports from the sources folder", () => {
    // index.ts is the public seam, not a core folder; it alone may export the edge.
    const files = productionFiles(SRC).filter(
      (file) => !file.endsWith(".test.ts") && file !== join(SRC, "index.ts"),
    );
    expect(files.length).toBeGreaterThan(0);

    const breaches = files.flatMap((file) =>
      [...readFileSync(file, "utf8").matchAll(IMPORT_SPECIFIER)]
        .map((match) => match[1])
        .filter((specifier) => specifier.startsWith("."))
        .filter(
          (specifier) => !relative(SOURCES, resolve(dirname(file), specifier)).startsWith(".."),
        )
        .map((specifier) => `${relative(SRC, file)} imports ${specifier}`),
    );
    expect(breaches).toEqual([]);
  });

  // The seam re-exports sources, so importing it would launder the edge into the core.
  it("never imports the root index to reach the edge through the seam", () => {
    const files = productionFiles(SRC).filter(
      (file) => !file.endsWith(".test.ts") && file !== join(SRC, "index.ts"),
    );
    const laundered = files.flatMap((file) =>
      [...readFileSync(file, "utf8").matchAll(IMPORT_SPECIFIER)]
        .map((match) => match[1])
        .filter((specifier) => specifier.startsWith("."))
        .map((specifier) => resolve(dirname(file), specifier))
        .filter((resolved) => resolved === join(SRC, "index") || resolved === join(SRC, "index.ts"))
        .map(() => `${relative(SRC, file)} imports the root index`),
    );
    expect(laundered).toEqual([]);
  });
});
