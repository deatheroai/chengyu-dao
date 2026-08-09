import { defineConfig } from "vite";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

// import.meta.dirname needs Node.js 20.11+; fileURLToPath works on any
// modern Node version, which matters since the exact Node version a
// deploy host (e.g. Vercel) picks for the build isn't something we control.
const rootDir = fileURLToPath(new URL(".", import.meta.url));

// Multi-page build: the castle game (index.html) and each snippet
// prototype (idiom-reveal.html for Snippet 2, meaning-check.html for
// Snippet 3, session.html for Snippet 5) are separate standalone pages
// while snippets are being validated independently, per SNIPPET_PLANS.md.
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(rootDir, "index.html"),
        idiomReveal: resolve(rootDir, "idiom-reveal.html"),
        meaningCheck: resolve(rootDir, "meaning-check.html"),
        session: resolve(rootDir, "session.html"),
      },
    },
  },
});
