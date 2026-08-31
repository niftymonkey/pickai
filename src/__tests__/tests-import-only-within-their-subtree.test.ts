import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";

const SRC = join(__dirname, "..");
const IMPORT_SPECIFIER = /from\s+"([^"]+)"/g;

const testFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return testFiles(path);
    return entry.isFile() && entry.name.endsWith(".test.ts") ? [path] : [];
  });

// A test in foo/__tests__ belongs to foo; a test beside its code belongs to that folder.
const subtreeOf = (file: string): string => {
  const folder = dirname(file);
  return basename(folder) === "__tests__" ? dirname(folder) : folder;
};

describe("every test file", () => {
  it("imports only from inside its own parent folder", () => {
    const files = testFiles(SRC);
    expect(files.length).toBeGreaterThan(0);

    const escapes = files.flatMap((file) => {
      const subtree = subtreeOf(file);
      return [...readFileSync(file, "utf8").matchAll(IMPORT_SPECIFIER)]
        .map((match) => match[1])
        .filter((specifier) => specifier.startsWith("."))
        .filter((specifier) =>
          relative(subtree, resolve(dirname(file), specifier)).startsWith(".."),
        )
        .map((specifier) => `${relative(SRC, file)} imports ${specifier}`);
    });
    expect(escapes).toEqual([]);
  });
});
