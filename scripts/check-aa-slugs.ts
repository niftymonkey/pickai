/**
 * Validation script: cross-reference OpenRouter fixture against live
 * Artificial Analysis data to verify slug derivation accuracy.
 *
 * Usage: npx tsx scripts/check-aa-slugs.ts
 * Requires ARTIFICIAL_ANALYSIS_API_KEY in .env (or review-kit/.env)
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { deriveAaSlug } from "../src/with-aa-slug";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Try local .env first, then fall back to review-kit
let apiKey: string | undefined;
for (const envPath of [
  resolve(__dirname, "../.env"),
  resolve(__dirname, "../../review-kit/.env"),
]) {
  try {
    const envFile = readFileSync(envPath, "utf8");
    apiKey = envFile.match(/ARTIFICIAL_ANALYSIS_API_KEY=(.+)/)?.[1]?.trim();
    if (apiKey) break;
  } catch {
    // try next
  }
}

if (!apiKey) {
  console.error("Missing ARTIFICIAL_ANALYSIS_API_KEY in .env or review-kit/.env");
  process.exit(1);
}

interface AAModel {
  id: string;
  name: string;
  slug: string;
  model_creator?: { name: string; slug: string };
}

interface ORModel {
  id: string;
  name: string;
}

async function main() {
  // Load OpenRouter fixture
  const fixture = JSON.parse(
    readFileSync(resolve(__dirname, "../src/__fixtures__/openrouter-models.json"), "utf8")
  );
  const orModels: ORModel[] = fixture.data;

  // Fetch AA models
  const res = await fetch(
    "https://artificialanalysis.ai/api/v2/data/llms/models",
    { headers: { "x-api-key": apiKey! } }
  );

  if (!res.ok) {
    console.error(`AA API error: ${res.status} ${res.statusText}`);
    process.exit(1);
  }

  const response = await res.json();
  const aaModels: AAModel[] = response.data;
  const aaSlugs = new Set(aaModels.map((m) => m.slug));

  // Cross-reference
  const matches: string[] = [];
  const mismatches: { or: string; derived: string; closest?: string }[] = [];
  const matched = new Set<string>();

  for (const or of orModels) {
    const derived = deriveAaSlug(or.id);
    if (aaSlugs.has(derived)) {
      matches.push(`${or.id} -> ${derived}`);
      matched.add(derived);
    } else {
      // Find closest AA slug for debugging
      const closest = aaModels.find((aa) =>
        aa.slug.includes(derived.split("-").slice(0, 3).join("-"))
      );
      mismatches.push({ or: or.id, derived, closest: closest?.slug });
    }
  }

  const unmatchedAa = aaModels.filter((m) => !matched.has(m.slug));

  console.log(`\n=== RESULTS ===`);
  console.log(`OpenRouter models: ${orModels.length}`);
  console.log(`AA models: ${aaModels.length}`);
  console.log(`Exact matches: ${matches.length}`);
  console.log(`Unmatched OR: ${mismatches.length}`);
  console.log(`Unmatched AA: ${unmatchedAa.length}`);
  console.log(`Match rate: ${((matches.length / orModels.length) * 100).toFixed(1)}%\n`);

  if (matches.length > 0) {
    console.log(`--- Exact matches (first 20) ---`);
    for (const m of matches.slice(0, 20)) console.log(`  ${m}`);
    if (matches.length > 20) console.log(`  ... and ${matches.length - 20} more`);
  }

  if (mismatches.length > 0) {
    console.log(`\n--- Mismatches (first 30) ---`);
    for (const m of mismatches.slice(0, 30)) {
      const hint = m.closest ? ` (closest AA: ${m.closest})` : "";
      console.log(`  ${m.or} -> ${m.derived}${hint}`);
    }
    if (mismatches.length > 30) console.log(`  ... and ${mismatches.length - 30} more`);
  }

  if (unmatchedAa.length > 0) {
    console.log(`\n--- Unmatched AA (first 20) ---`);
    for (const m of unmatchedAa.slice(0, 20)) {
      console.log(`  ${m.slug} (${m.name})`);
    }
    if (unmatchedAa.length > 20) console.log(`  ... and ${unmatchedAa.length - 20} more`);
  }
}

main().catch(console.error);
