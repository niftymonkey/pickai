import type { Rule, SortAxis } from "./engine";

/**
 * The last real rule set, persisted so a returning visitor can pick up where
 * they left off. This is the honest version of the old "Re-checking" preset.
 */

const KEY = "pickai-rules";

export interface SavedRules {
  rules: Rule[];
  axis: SortAxis;
  weights?: Record<string, number>;
}

let listeners: (() => void)[] = [];

export function subscribeSavedRules(listener: () => void): () => void {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((entry) => entry !== listener);
  };
}

export function readSavedRules(): string | null {
  return window.localStorage.getItem(KEY);
}

export function readSavedRulesServer(): null {
  return null;
}

/** Only real rule sets are worth resuming; an empty set never overwrites one. */
export function saveRules(
  rules: Rule[],
  axis: SortAxis,
  weights: Record<string, number>,
): void {
  if (rules.length === 0) return;
  window.localStorage.setItem(KEY, JSON.stringify({ rules, axis, weights }));
  for (const listener of listeners) listener();
}

export function parseSavedRules(raw: string | null): SavedRules | null {
  if (raw === null) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.rules) && parsed.rules.length > 0) {
      return parsed;
    }
  } catch {
    // Malformed storage reads as nothing saved.
  }
  return null;
}
