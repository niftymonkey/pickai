// @ts-check
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import starlightLlmsTxt from "starlight-llms-txt";

export default defineConfig({
  site: "https://pickai.niftymonkey.dev",
  vite: {
    resolve: {
      alias: {
        "@examples": new URL("../examples", import.meta.url).pathname,
      },
    },
  },
  integrations: [
    starlight({
      title: "pickai",
      customCss: ["./src/styles/custom.css"],
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
        { label: "Getting Started", slug: "getting-started" },
        {
          label: "Concepts",
          items: [
            { label: "Filtering", slug: "concepts/filtering" },
            { label: "Scoring & Ranking", slug: "concepts/scoring" },
            { label: "Purpose Profiles", slug: "concepts/purpose-profiles" },
            { label: "Constraints", slug: "concepts/constraints" },
            { label: "Data Sources", slug: "concepts/data-sources" },
          ],
        },
        {
          label: "API",
          items: [
            { label: "find", slug: "reference/find" },
            { label: "recommend", slug: "reference/recommend" },
          ],
        },
        { label: "Types", slug: "reference/types" },
        {
          label: "Utilities",
          items: [
            { label: "applyFilter", slug: "reference/apply-filter" },
            { label: "fromModelsDev", slug: "reference/from-models-dev" },
            { label: "matchesModel", slug: "reference/matches-model" },
            { label: "parseModelsDevData", slug: "reference/parse-models-dev-data" },
            { label: "perFamily", slug: "reference/per-family" },
            { label: "perProvider", slug: "reference/per-provider" },
            { label: "scoreModels", slug: "reference/score-models" },
          ],
        },
        {
          label: "Examples",
          items: [
            {
              label: "Concepts",
              items: [
                { label: "Basic Usage", slug: "examples/basic-usage" },
                { label: "Filtering", slug: "examples/filtering" },
                { label: "Custom Scoring", slug: "examples/custom-scoring" },
                { label: "Constraints", slug: "examples/constraints" },
                { label: "Custom Source", slug: "examples/custom-source" },
              ],
            },
            {
              label: "Recipes",
              items: [
                { label: "Benchmark Scoring", slug: "examples/benchmark-scoring" },
                { label: "Frontier vs. Open-Weight", slug: "examples/frontier-vs-open-weight" },
              ],
            },
          ],
        },
      ],
    }),
  ],
});
