import { defineConfig } from "vite";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

// import.meta.dirname needs Node.js 20.11+; fileURLToPath works on any
// modern Node version, which matters since the exact Node version a
// deploy host (e.g. Vercel) picks for the build isn't something we control.
const rootDir = fileURLToPath(new URL(".", import.meta.url));

// Two-page build: index.html is a static redirect to idiom-door.html,
// the real root-URL game (2026-08-26 consolidation — see BACKLOG.md and
// DECISIONS.md). The five prototypes idiom-door superseded/absorbed
// (idiom-reveal, meaning-check, session, catch-meaning, platform-catch)
// were removed the same day; their still-useful pieces (applicationCheck,
// positionStatus, sessionHistory) live on under src/shared/.
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        index: resolve(rootDir, "index.html"),
        idiomDoor: resolve(rootDir, "idiom-door.html"),
        scienceSnake: resolve(rootDir, "science-snake.html"),
      },
    },
  },
});
