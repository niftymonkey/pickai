import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const IDENTITY_DIR = join(__dirname, "..", "identity");
const IMPORT_SPECIFIER = /from\s+"([^"]+)"/g;

const productionFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".ts"))
    .map((entry) => join(dir, entry.name));

const specifiersIn = (file: string): string[] => [
  ...readFileSync(file, "utf8").matchAll(IMPORT_SPECIFIER),
].map((match) => match[1]);

describe("the identity folder", () => {
  it("imports nothing from outside itself", () => {
    const files = productionFiles(IDENTITY_DIR);
    expect(files.length).toBeGreaterThan(0);

    const outside = files.flatMap((file) =>
      specifiersIn(file)
        .filter((specifier) => !/^\.\/[^/]+$/.test(specifier))
        .map((specifier) => `${file} imports ${specifier}`),
    );
    expect(outside).toEqual([]);
  });
});
