// The decision line: one sentence for what the rules left and what orders it, plus a
// quieter line for what the last move did to the top of the board.

import type { DeltaNote } from "@/core/score-view";

interface DecisionLineProps {
  sentence: string;
  /** What the last move did to the top rows; null before anything has moved. */
  note: DeltaNote | null;
}

const DecisionLine = ({ sentence, note }: DecisionLineProps) => (
  <div className="mb-4 border-b border-line pb-3">
    <p aria-live="polite" className="text-[17px] leading-snug text-ink">
      {sentence}
    </p>
    {/* The slot is reserved at rest: a line that appears must not push the page down. */}
    <p aria-live="polite" className="mt-1.5 min-h-5 text-sm text-accent-ink">
      {note && (
        <>
          {note.lead}
          {note.quiet !== null && <span className="text-ink-2"> {note.quiet}</span>}
        </>
      )}
    </p>
  </div>
);

export { DecisionLine };
