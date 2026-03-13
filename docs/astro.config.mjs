// @ts-check
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import starlightLlmsTxt from "starlight-llms-txt";

export default defineConfig({
  site: "https://pickai.niftymonkey.dev",
  integrations: [
    starlight({
      title: "pickai",
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/niftymonkey/pickai",
        },
      ],
      plugins: [
        starlightLlmsTxt({
          projectName: "pickai",
          description:
            "Filter, score, and recommend AI models across providers. Metadata-first, powered by models.dev. Zero dependencies.",
        }),
      ],
      sidebar: [
        {
          label: "Start Here",
          items: [
            { label: "Getting Started", slug: "getting-started" },
          ],
        },
        {
          label: "Guides",
          items: [
            { label: "Filtering Models", slug: "guides/filtering" },
            { label: "Scoring & Ranking", slug: "guides/scoring" },
            { label: "Purpose Profiles", slug: "guides/purpose-profiles" },
            { label: "Constraints", slug: "guides/constraints" },
            { label: "Data Sources", slug: "guides/data-sources" },
          ],
        },
        {
          label: "API Reference",
          items: [
            { label: "createPicker", slug: "reference/create-picker" },
            { label: "find", slug: "reference/find" },
            { label: "recommend", slug: "reference/recommend" },
            { label: "Scoring Criteria", slug: "reference/scoring-criteria" },
            { label: "Constraints", slug: "reference/constraints" },
            { label: "Purpose", slug: "reference/purpose" },
            { label: "Utilities", slug: "reference/utilities" },
            { label: "Types", slug: "reference/types" },
          ],
        },
        {
          label: "Examples",
          autogenerate: { directory: "examples" },
        },
      ],
    }),
  ],
});
