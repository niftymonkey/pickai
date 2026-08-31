/**
 * Ghost chips that fly a preset's rules from the tapped button down to
 * wherever the rules live: the left rail on desktop, the bottom bar on phone.
 * Pure show; the rules are already applied when the flight starts.
 */

const HOMES = ["rules-home-desktop", "rules-home-mobile"];

function visibleTarget(): DOMRect | null {
  for (const id of HOMES) {
    const element = document.getElementById(id);
    if (!element) continue;
    const rect = element.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) return rect;
  }
  return null;
}

export function flyRules(labels: string[], from: DOMRect): void {
  if (labels.length === 0) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const to = visibleTarget();
  if (!to) return;

  labels.forEach((label, index) => {
    const ghost = document.createElement("div");
    ghost.className = "rule-ghost";
    ghost.textContent = label;
    ghost.style.left = `${from.left}px`;
    ghost.style.top = `${from.top + index * 7}px`;
    document.body.appendChild(ghost);

    const dx = to.left + 14 - from.left;
    const dy = to.top + 10 - (from.top + index * 7);
    const animation = ghost.animate(
      [
        { transform: "translate(0, 0) scale(1)", opacity: 1 },
        {
          transform: `translate(${dx}px, ${dy}px) scale(0.8)`,
          opacity: 0.15,
        },
      ],
      {
        duration: 520,
        delay: index * 90,
        easing: "cubic-bezier(0.25, 1, 0.5, 1)",
        fill: "both",
      },
    );
    animation.finished
      .catch(() => undefined)
      .finally(() => ghost.remove());
  });
}
