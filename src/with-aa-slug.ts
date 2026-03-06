import type { Model, ApiSlugs } from "./types";

export type AaSlugModel = Model & {
  apiSlugs: ApiSlugs & { artificialAnalysis: string };
};

/**
 * Derive the Artificial Analysis slug from an OpenRouter ID.
 *
 * Steps:
 * 1. Strip provider prefix (before `/`)
 * 2. Replace dots with hyphens
 * 3. Strip `:variant` suffixes (`:free`, `:thinking`)
 * 4. Lowercase (defensive)
 */
export function deriveAaSlug(openRouterId: string): string {
  let slug = openRouterId;

  // Strip provider prefix
  if (slug.includes("/")) {
    slug = slug.split("/").slice(1).join("/");
  }

  // Replace dots with hyphens
  slug = slug.replace(/\./g, "-");

  // Strip colon suffixes
  if (slug.includes(":")) {
    slug = slug.slice(0, slug.indexOf(":"));
  }

  return slug.toLowerCase();
}

export function withAaSlug<T extends Model>(model: T): T & AaSlugModel {
  return {
    ...model,
    apiSlugs: {
      ...model.apiSlugs,
      artificialAnalysis: deriveAaSlug(model.apiSlugs.openRouter),
    },
  };
}
