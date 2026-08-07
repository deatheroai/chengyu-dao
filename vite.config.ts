import { defineConfig } from "vite";
import { resolve } from "node:path";

// Multi-page build: the castle game (index.html) and the idiom-reveal
// prototype (idiom-reveal.html, Snippet 2) are separate standalone pages
// while snippets are being validated independently, per SNIPPET_PLANS.md.
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, "index.html"),
        idiomReveal: resolve(import.meta.dirname, "idiom-reveal.html"),
      },
    },
  },
});
