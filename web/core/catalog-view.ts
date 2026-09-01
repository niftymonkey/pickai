// Catalog rows and counts: model identities flattened for display.

import type { ModelIdentity } from "pickai";

interface CatalogRow {
  key: string;
  name: string;
  maker: string | null;
  sellerCount: number;
  /** USD per 1M input tokens. Null means unknown. */
  costIn: number | null;
  /** USD per 1M output tokens. Null means unknown. */
  costOut: number | null;
  context: number | null;
  output: number | null;
  released: string | null;
  cutoff: string | null;
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
});

const byDisplayName = (a: CatalogRow, b: CatalogRow): number =>
  a.name < b.name ? -1 : a.name > b.name ? 1 : 0;

const catalogRows = (identities: ModelIdentity[]): CatalogRow[] =>
  identities.map(rowFromIdentity).sort(byDisplayName);

const catalogCounts = (identities: ModelIdentity[]): { models: number; listings: number } => ({
  models: identities.length,
  listings: identities.reduce((total, { listings }) => total + listings.length, 0),
});

export { catalogRows, catalogCounts };
export type { CatalogRow };
