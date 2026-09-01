// The one tooltip pattern for every info hover: hover, focus, and touch all open it.

import { useEffect, useId, useState } from "react";

interface InfoHoverProps {
  /** The trigger's accessible name, e.g. "About the catalog". */
  label: string;
  tip: string;
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
        className="flex h-[15px] w-[15px] items-center justify-center rounded-full border border-line font-mono text-[0.65rem] text-ink-3"
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
          className={`absolute top-full z-40 w-72 pt-1.5 ${align === "right" ? "right-0" : "left-0"}`}
        >
          <span className="block rounded-lg border border-line bg-card px-2.5 py-2 text-xs text-ink-2">
            {tip}
          </span>
        </span>
      )}
    </span>
  );
};

export { InfoHover };
