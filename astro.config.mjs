// @ts-check
import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";

import cloudflare from "@astrojs/cloudflare";

// https://astro.build/config
export default defineConfig({
  site: "https://jacky-wong9273.com",
  output: "static",
  integrations: [mdx()],

  markdown: {
    shikiConfig: {
      theme: "github-dark",
    },
  },

  adapter: cloudflare(),
});