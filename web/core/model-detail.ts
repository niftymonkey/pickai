// What one model's panel says: the facts a row carries beyond the five columns,
// stated so that a source's silence is never read as a no.

import type { ReasoningOption } from "pickai";

/**
 * What the source said about a capability. `unstated` is not `no`: models.dev
 * never mentions structured output for a third of the catalog, and a rule that
 * cuts on silence cuts models for never having been labelled.
 */
type Say = "yes" | "no" | "unstated";

interface Capability {
  name: string;
  label: string;
  say: Say;
}

// The capability vocabulary, in the order the panel shows it.
const CAPABILITY_LABELS: { name: string; label: string }[] = [
  { name: "reasoning", label: "Reasoning" },
  { name: "toolCall", label: "Tool calling" },
  { name: "structuredOutput", label: "Structured output" },
  { name: "attachment", label: "Attachments" },
  { name: "openWeights", label: "Open weights" },
  { name: "temperature", label: "Temperature" },
];

const sayOf = (value: boolean | undefined): Say =>
  value === undefined ? "unstated" : value ? "yes" : "no";

/** Every capability the panel shows, each carrying what the source said about it. */
const capabilities = (values: Record<string, boolean | undefined>): Capability[] =>
  CAPABILITY_LABELS.map(({ name, label }) => ({ name, label, say: sayOf(values[name]) }));

const counted = (n: number): string => n.toLocaleString("en-US");

// Each option describes itself from its own shape, so a source that publishes a
// new steering control needs no new sentence written for it.
const steeringPhrase = (option: ReasoningOption): string => {
  switch (option.kind) {
    case "effort":
      return `effort levels ${option.values.join(", ")}`;
    case "budgetTokens":
      return option.min === undefined || option.max === undefined
        ? "a thinking budget"
        : `a thinking budget of ${counted(option.min)} to ${counted(option.max)} tokens`;
    case "toggle":
      return "an on-off switch";
  }
};

/**
 * How this model's reasoning is steered, in one sentence. Null when the source
 * published no steering control, which is most of the catalog.
 */
const steeringSentence = (options: ReasoningOption[] | undefined): string | null => {
  if (options === undefined || options.length === 0) return null;
  return `Steered by ${options.map(steeringPhrase).join(", and ")}.`;
};

export { capabilities, steeringSentence };
export type { Capability, Say };
