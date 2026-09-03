// Catalog rows and counts: model identities flattened for display.

import type { ModelIdentity, ReasoningOption } from "pickai";

interface CatalogRow {
  key: string;
  name: string;
  maker: string | null;
  /** How many providers publish this model. A count only: this is not a price board. */
  sellerCount: number;
  /** The source's own one-line description. Null when it publishes none. */
  about: string | null;
  family: string | null;
  /** USD per 1M input tokens. Null means unknown. */
  costIn: number | null;
  /** USD per 1M output tokens. Null means unknown. */
  costOut: number | null;
  context: number | null;
  output: number | null;
  released: string | null;
  cutoff: string | null;
  /** When the catalog itself last changed this entry. */
  updated: string | null;
  /** USD per 1M cached input tokens. Null means unknown. */
  cacheRead: number | null;
  cacheWrite: number | null;
  modalitiesIn: string[];
  modalitiesOut: string[];
  /** Raw capability values, undefined where the source said nothing. */
  capabilityValues: Record<string, boolean | undefined>;
  reasoningOptions: ReasoningOption[] | undefined;
  deprecated: boolean;
}

// models.dev publishes 0 for a token limit it does not know; a real limit is never 0.
const tokenLimitOrUnknown = (limit: number): number | null => (limit === 0 ? null : limit);

const rowFromIdentity = ({ key, maker, representative, listings }: ModelIdentity): CatalogRow => ({
  key,
  name: representative.name,
  maker,
  sellerCount: listings.length,
  costIn: representative.cost ? representative.cost.input : null,
  costOut: representative.cost ? representative.cost.output : null,
  context: tokenLimitOrUnknown(representative.limit.context),
  output: tokenLimitOrUnknown(representative.limit.output),
  released: representative.releaseDate ?? null,
  cutoff: representative.knowledge ?? null,
  about: representative.description ?? null,
  family: representative.family ?? null,
  updated: representative.lastUpdated ?? null,
  cacheRead: representative.cost?.cacheRead ?? null,
  cacheWrite: representative.cost?.cacheWrite ?? null,
  modalitiesIn: representative.modalities.input,
  modalitiesOut: representative.modalities.output,
  // Written out rather than copied: undefined must survive as undefined, because
  // the panel and every rule depend on telling silence from a stated no.
  capabilityValues: {
    reasoning: representative.reasoning,
    toolCall: representative.toolCall,
    structuredOutput: representative.structuredOutput,
    attachment: representative.attachment,
    openWeights: representative.openWeights,
    temperature: representative.temperature,
  },
  reasoningOptions: representative.reasoningOptions,
  deprecated: representative.status === "deprecated",
});

const catalogCounts = (identities: ModelIdentity[]): { models: number; listings: number } => ({
  models: identities.length,
  listings: identities.reduce((total, { listings }) => total + listings.length, 0),
});

export { catalogCounts, rowFromIdentity };
export type { CatalogRow };
