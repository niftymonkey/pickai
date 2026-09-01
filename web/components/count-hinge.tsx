// The rail's live survivor count: it tweens toward the target, or jumps under reduced motion.

import { useEffect, useRef, useState } from "react";

const TWEEN_MS = 360;

// The JS form of --ease-out-quart, for the rAF tween.
const easeOutQuart = (progress: number): number => 1 - (1 - progress) ** 4;

const AnimatedNumber = ({ value }: { value: number }) => {
  const [shown, setShown] = useState(value);
  const shownRef = useRef(value);

  // The one allowed useEffect: syncing the shown number with the target via rAF.
  // Reduced motion runs a zero-duration tween, so the jump still lands through rAF.
  useEffect(() => {
    const from = shownRef.current;
    if (from === value) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const duration = reduce ? 0 : TWEEN_MS;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const progress = duration === 0 ? 1 : Math.min(1, (now - start) / duration);
      const current = Math.round(from + (value - from) * easeOutQuart(progress));
      shownRef.current = current;
      setShown(current);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return <span className="tnum">{shown.toLocaleString("en-US")}</span>;
};

interface CountHingeProps {
  survivors: number;
  total: number;
  ruleCount: number;
}

const CountHinge = ({ survivors, total, ruleCount }: CountHingeProps) => (
  <div>
    <p className="tnum font-mono text-4xl font-semibold tracking-tight text-rail-ink">
      <AnimatedNumber value={survivors} />
    </p>
    <p className="mt-0.5 text-xs text-rail-ink-2">
      {ruleCount === 0 ? (
        <>models in the catalog, before any rules</>
      ) : (
        <>
          of <span className="tnum">{total.toLocaleString("en-US")}</span> models pass your{" "}
          {ruleCount === 1 ? "rule" : "rules"}
        </>
      )}
    </p>
  </div>
);

export { CountHinge };
