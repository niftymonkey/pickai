// The one tooltip pattern for every info hover: hover, focus, and touch all open it.

import { useEffect, useId, useState } from "react";

/**
 * A tip's content. The status line says where the numbers came from; the body is one
 * paragraph per group of related facts, never one per sentence. Splitting on every full
 * stop is not grouping, it is just line breaks.
 */
interface Tip {
  /** Where the numbers came from, or what went wrong. Leads the tip, above a rule. */
  status?: string;
  /** One paragraph per group of related facts. Two is usually plenty. */
  body: string[];
}

interface InfoHoverProps {
  /** The trigger's accessible name, e.g. "About the catalog". */
  label: string;
  tip: Tip;
  /** Which edge of the trigger the tip hangs from. */
  align?: "left" | "right";
}

const InfoHover = ({ label, tip, align = "left" }: InfoHoverProps) => {
  const [open, setOpen] = useState(false);
  const id = useId();

  // The one allowed useEffect: an open tip listens for Escape on the document, so a
  // hover-opened tip dismisses without moving the pointer (WCAG 1.4.13).
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-describedby={open ? id : undefined}
        onClick={() => setOpen(!open)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        // The glyph is 15px; the invisible ::before pad grows the target to 27px (WCAG 2.5.8).
        className="relative flex h-[15px] w-[15px] items-center justify-center rounded-full border border-line font-mono text-[0.65rem] text-ink-3 transition-colors duration-150 before:absolute before:-inset-1.5 before:content-[''] hover:border-accent hover:bg-accent hover:text-card focus-visible:border-accent focus-visible:bg-accent focus-visible:text-card"
      >
        i
      </button>
      {open && (
        // The gap is padding inside the tip, not margin, so the pointer can cross
        // into the tip without it closing (hoverable content, WCAG 1.4.13).
        // z-40 outranks the table's sticky header, which otherwise paints over the tip.
        <span
          role="tooltip"
          id={id}
          className={`absolute top-full z-40 w-80 pt-1.5 ${align === "right" ? "right-0" : "left-0"}`}
        >
          {/* font-sans is stated, not inherited: this tip hangs off a trigger that sits
              inside a monospace receipt line, and it picked the mono face up from it. */}
          <span className="block rounded-lg border border-line bg-card px-3 py-2.5 font-sans">
            {/* One typeface throughout. The status carries tabular figures for its date,
                not a second font: a mono label beside sans prose reads as a mistake. */}
            {tip.status !== undefined && (
              <span className="tnum mb-2 block border-b border-line pb-2 text-[11px] font-medium text-ink">
                {tip.status}
              </span>
            )}
            <span className="flex flex-col gap-2">
              {tip.body.map((paragraph) => (
                <span key={paragraph} className="block text-xs leading-[1.55] text-ink-2">
                  {paragraph}
                </span>
              ))}
            </span>
          </span>
        </span>
      )}
    </span>
  );
};

export { InfoHover };
export type { Tip };
