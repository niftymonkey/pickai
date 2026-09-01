// A maker or seller roster: an Only/Never mode and a searchable checklist of real names.

import { useId, useState } from "react";
import { toggled } from "@/core/decision";
import type { Roster, RosterMode } from "@/core/decision";

interface RosterChecklistProps {
  noun: "makers" | "sellers";
  roster: Roster;
  names: string[];
  onChange: (roster: Roster) => void;
}

const MODES: { mode: RosterMode; label: string }[] = [
  { mode: "allow", label: "Only these" },
  { mode: "exclude", label: "Never these" },
];

const modeChipClass = (active: boolean): string =>
  `rounded-md border px-2 py-1 text-sm transition-colors duration-150 ${
    active
      ? "border-accent bg-accent-soft text-accent-ink"
      : "border-rail-line text-rail-ink hover:border-accent"
  }`;

const RosterChecklist = ({ noun, roster, names, onChange }: RosterChecklistProps) => {
  const [query, setQuery] = useState("");
  const searchId = useId();
  const needle = query.trim().toLowerCase();
  const shown = names.filter((name) => name.toLowerCase().includes(needle));

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-1.5" role="group" aria-label={`${noun} rule mode`}>
        {MODES.map(({ mode, label }) => (
          <button
            key={mode}
            type="button"
            aria-pressed={roster.mode === mode}
            onClick={() => onChange({ ...roster, mode })}
            className={modeChipClass(roster.mode === mode)}
          >
            {label}
          </button>
        ))}
      </div>
      <label className="sr-only" htmlFor={searchId}>
        Find a {noun.slice(0, -1)}
      </label>
      <input
        id={searchId}
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={`Find a ${noun.slice(0, -1)}`}
        className="rounded-md border border-rail-line bg-rail-hover px-2 py-1 text-sm text-rail-ink placeholder:text-rail-ink-3"
      />
      {shown.length === 0 ? (
        <p className="text-xs text-rail-ink-3">No {noun} match.</p>
      ) : (
        <ul className="max-h-44 overflow-y-auto pr-1">
          {shown.map((name) => (
            <li key={name}>
              <label className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-0.5 text-sm text-rail-ink hover:bg-rail-hover">
                <input
                  type="checkbox"
                  checked={roster.names.includes(name)}
                  onChange={() => onChange({ ...roster, names: toggled(roster.names, name) })}
                  className="accent-accent"
                />
                {name}
              </label>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export { RosterChecklist };
