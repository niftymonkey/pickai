/**
 * The shortlist persists like the theme does: the user's own explicit picks,
 * restored automatically. Unlike rules, nothing here decides anything.
 */

const KEY = "pickai-pins";

let listeners: (() => void)[] = [];

export function subscribePins(listener: () => void): () => void {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((entry) => entry !== listener);
  };
}

export function readPinsRaw(): string | null {
  return window.localStorage.getItem(KEY);
}

export function readPinsServer(): null {
  return null;
}

export function savePins(pins: string[]): void {
  window.localStorage.setItem(KEY, JSON.stringify(pins));
  for (const listener of listeners) listener();
}

export function parsePins(raw: string | null): string[] {
  if (raw === null) return [];
  try {
    const parsed = JSON.parse(raw);
    if (
      Array.isArray(parsed) &&
      parsed.every((entry) => typeof entry === "string")
    ) {
      return parsed;
    }
  } catch {
    // Malformed storage reads as no pins.
  }
  return [];
}
