import type { Rule, SortAxis } from "./engine";

/**
 * The six situations from the North Star, as form-fillers. A preset writes
 * visible, editable rules and picks a sort; it never decides invisibly
 * (decision 9.20).
 */
export interface Preset {
  name: string;
  hint: string;
  axis: SortAxis;
  build: (rid: () => string) => Rule[];
}

export const PRESETS: Preset[] = [
  {
    name: "New app",
    hint: "Tool calling and structured output, best measured first",
    axis: "score",
    build: (rid) => [
      { id: rid(), kind: "capability", capability: "toolCall" },
      { id: rid(), kind: "capability", capability: "structuredOutput" },
    ],
  },
  {
    name: "Prototyping",
    hint: "Everything sane-priced on the table, best measured first",
    axis: "score",
    build: (rid) => [
      { id: rid(), kind: "costFence", side: "input", ceiling: 10 },
      { id: rid(), kind: "costFence", side: "output", ceiling: 40 },
    ],
  },
  {
    name: "Coding agent",
    hint: "Reasoning, tools, and a big context",
    axis: "score",
    build: (rid) => [
      { id: rid(), kind: "capability", capability: "reasoning" },
      { id: rid(), kind: "capability", capability: "toolCall" },
      { id: rid(), kind: "minContext", tokens: 200_000 },
    ],
  },
  {
    name: "Going cheaper",
    hint: "Fence off the absurd, cheapest input first",
    axis: "costIn",
    build: (rid) => [
      { id: rid(), kind: "costFence", side: "output", ceiling: 15 },
    ],
  },
  {
    name: "Forced switch",
    hint: "Exclude the provider you are leaving, then edit it",
    axis: "score",
    build: (rid) => [
      { id: rid(), kind: "provider", mode: "exclude", providers: ["anthropic"] },
    ],
  },
  {
    name: "Self-hosting",
    hint: "Open weights you can run yourself, best measured first",
    axis: "score",
    build: (rid) => [
      { id: rid(), kind: "capability", capability: "openWeights" },
    ],
  },
];
