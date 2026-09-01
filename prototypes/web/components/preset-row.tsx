import { PRESETS, type Preset } from "@/lib/presets";

export function PresetRow({
  onPick,
}: {
  onPick: (preset: Preset, source: DOMRect) => void;
}) {
  return (
    <section
      aria-label="Start from a situation"
      className="flex flex-col gap-2 lg:flex-row lg:items-baseline lg:justify-between lg:gap-6"
    >
      <p className="text-sm text-ink-2 lg:text-xs lg:text-ink-3">
        Start from a situation:
      </p>
      <div className="grid grid-cols-2 gap-2 lg:flex lg:flex-wrap lg:justify-end lg:gap-1.5">
        {PRESETS.map((preset) => (
          <button
            key={preset.name}
            type="button"
            title={preset.hint}
            onClick={(event) =>
              onPick(preset, event.currentTarget.getBoundingClientRect())
            }
            className="rounded-lg border border-line bg-card px-3 py-2 text-left transition-colors duration-150 hover:border-accent hover:bg-accent-soft lg:py-1.5"
          >
            <span className="block text-sm font-medium text-ink">{preset.name}</span>
            <span className="hidden text-xs text-ink-2 sm:block lg:hidden">
              {preset.hint}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
