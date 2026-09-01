import { useEffect, useRef, useState } from "react";

/** Tweens toward the target value; jumps instantly under reduced motion. */
export function AnimatedNumber({ value }: { value: number }) {
  const [shown, setShown] = useState(value);
  const shownRef = useRef(value);

  // Sync the displayed number with the target via rAF (external system).
  useEffect(() => {
    const from = shownRef.current;
    if (from === value) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const duration = reduce ? 0 : 360;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const progress =
        duration === 0 ? 1 : Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 4);
      const current = Math.round(from + (value - from) * eased);
      shownRef.current = current;
      setShown(current);
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return <span className="tnum">{shown.toLocaleString("en-US")}</span>;
}

/** The pipeline's live readout; it lives with the rules that cause it. */
export function CountHinge({
  surviving,
  total,
  ruleCount,
}: {
  surviving: number;
  total: number;
  ruleCount: number;
}) {
  return (
    <div>
      <p className="tnum font-mono text-4xl font-semibold tracking-tight text-rail-ink">
        <AnimatedNumber value={surviving} />
      </p>
      <p className="mt-0.5 text-xs text-rail-ink-2">
        {ruleCount === 0 ? (
          <>models in the catalog, before any rules</>
        ) : (
          <>
            of{" "}
            <span className="tnum font-mono">
              {total.toLocaleString("en-US")}
            </span>{" "}
            models pass your {ruleCount === 1 ? "rule" : "rules"}
          </>
        )}
      </p>
    </div>
  );
}
