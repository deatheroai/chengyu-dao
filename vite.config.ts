import { defineConfig } from "vite";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

// import.meta.dirname needs Node.js 20.11+; fileURLToPath works on any
// modern Node version, which matters since the exact Node version a
// deploy host (e.g. Vercel) picks for the build isn't something we control.
const rootDir = fileURLToPath(new URL(".", import.meta.url));

// Multi-page build: index.html is a static redirect to idiom-door.html
// (the current default entry point) and each snippet prototype
// (idiom-reveal.html for Snippet 2, meaning-check.html for Snippet 3,
// session.html for Snippet 5, catch-meaning.html for the Phase 0
// catch-mechanic spike, platform-catch.html for the Phase 2
// movement+jump spike that superseded it, idiom-door.html for the
// meaning-first ordered-character redesign) is a separate standalone
// page while snippets are being validated independently, per
// SNIPPET_PLANS.md / CATCH_MECHANIC_PLAN.md.
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        index: resolve(rootDir, "index.html"),
        idiomReveal: resolve(rootDir, "idiom-reveal.html"),
        meaningCheck: resolve(rootDir, "meaning-check.html"),
        session: resolve(rootDir, "session.html"),
        catchMeaning: resolve(rootDir, "catch-meaning.html"),
        platformCatch: resolve(rootDir, "platform-catch.html"),
        idiomDoor: resolve(rootDir, "idiom-door.html"),
      },
    },
  },
});
