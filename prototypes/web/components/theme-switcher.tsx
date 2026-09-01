import { useEffect, useSyncExternalStore } from "react";

/** System follows the OS; Light forces Blueprint, Dark forces Night. */

const KEY = "pickai-theme";
const MODES = ["system", "light", "dark"];

let listeners: (() => void)[] = [];

function subscribe(listener: () => void): () => void {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((entry) => entry !== listener);
  };
}

function getMode(): string {
  const saved = window.localStorage.getItem(KEY);
  return saved !== null && MODES.includes(saved) ? saved : "system";
}

function setMode(next: string): void {
  window.localStorage.setItem(KEY, next);
  for (const listener of listeners) listener();
}

export function ThemeSwitcher() {
  const mode = useSyncExternalStore(subscribe, getMode, () => "system");

  // Mirror the chosen mode onto <html> so the color-scheme override applies.
  useEffect(() => {
    if (mode === "system") delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = mode;
  }, [mode]);

  return (
    <div className="fixed bottom-16 right-3 z-30 flex gap-1 rounded-full border border-line bg-card px-1.5 py-1 shadow-sm lg:bottom-4 lg:right-4">
      {MODES.map((id) => (
        <button
          key={id}
          type="button"
          aria-pressed={mode === id}
          onClick={() => setMode(id)}
          className={`rounded-full px-2.5 py-0.5 text-xs capitalize transition-colors duration-150 ${
            mode === id ? "bg-accent text-card" : "text-ink-2 hover:text-ink"
          }`}
        >
          {id}
        </button>
      ))}
    </div>
  );
}
