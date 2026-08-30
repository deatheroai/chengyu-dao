// Smoke-tests every compiled api/*.ts function the exact way Node's
// real ESM loader resolves it in production. This repo's package.json
// has "type": "module", and Vercel's Node.js function build does NOT
// bundle api/*.ts into one file for that case -- it transpiles 1:1 and
// lets Node's own ESM loader resolve imports at runtime. That loader
// (unlike CommonJS require, and unlike Vite/Vitest's own, more lenient
// resolver) requires an explicit file extension on every relative
// import; get that wrong and typecheck/test/build/test:e2e can all
// pass clean while production crashes on every request with
// ERR_MODULE_NOT_FOUND. That's exactly the bug this script exists to
// catch -- found live, 2026-08-30 (see BACKLOG.md), invisible to every
// other gate because none of them run the *compiled* output through a
// real, unbundled Node ESM loader the way a deploy actually does.
//
// Invoked by `npm run build` (via `verify:api`, after tsc emits real
// .js into .api-build) so it gates every commit the same as
// typecheck/test/test:e2e already do.
import { readdir } from "node:fs/promises";

const API_BUILD_DIR = new URL("../.api-build/api/", import.meta.url);

const entries = await readdir(API_BUILD_DIR);
const handlerFiles = entries.filter((name) => name.endsWith(".js") && !name.endsWith(".test.js"));

if (handlerFiles.length === 0) {
  console.error("check-api-esm: no compiled api/*.js handler files found -- did the tsc emit step run?");
  process.exit(1);
}

let failed = false;

for (const file of handlerFiles) {
  const fileUrl = new URL(file, API_BUILD_DIR).href;
  try {
    const mod = await import(fileUrl);
    if (typeof mod.default?.fetch !== "function") {
      console.error(`check-api-esm: api/${file} has no default export with a fetch(request) handler`);
      failed = true;
      continue;
    }
    // A functional call, not just a successful import -- catches a
    // runtime crash inside the handler too (e.g. something throwing
    // at construction time), not only a missing-module import error.
    const response = await mod.default.fetch(new Request(`https://example.com/api/${file.replace(/\.js$/, "")}`));
    if (!(response instanceof Response) || typeof response.status !== "number") {
      console.error(`check-api-esm: api/${file}'s fetch handler did not return a Response`);
      failed = true;
    } else {
      console.log(`check-api-esm: api/${file} OK (responded ${response.status})`);
    }
  } catch (err) {
    console.error(`check-api-esm: importing/running api/${file} failed -- exactly the class of bug that otherwise only shows up in a real deploy:`);
    console.error(err);
    failed = true;
  }
}

process.exit(failed ? 1 : 0);
