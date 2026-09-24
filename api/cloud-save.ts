import { Redis } from "@upstash/redis";
// The explicit .js extension (on an import of a .ts source file) is
// deliberate, not a typo: this repo's package.json has "type": "module",
// and unlike Vite's dev/build pipeline (which resolves extensionless
// imports generously) or a bundler, Vercel's Node.js function build
// does NOT bundle api/*.ts into one file -- it transpiles 1:1 and lets
// Node's own ESM loader resolve imports at runtime. Node's ESM loader,
// unlike CommonJS require, requires an explicit extension on every
// relative import; omitting it here previously deployed fine under
// `npm run build`/`vite dev` but crashed every real invocation in
// production with ERR_MODULE_NOT_FOUND (found live, 2026-08-30 -- see
// BACKLOG.md). TypeScript's "bundler" moduleResolution explicitly
// supports writing the .js extension against a .ts source for exactly
// this case.
import {
  isValidCloudSaveCode,
  isValidCloudSaveGame,
  isValidCloudSavePayload,
  DEFAULT_CLOUD_SAVE_GAME,
  type CloudSaveGame,
} from "../src/shared/cloudSaveValidation.js";

/**
 * Cloud-save sync endpoint (DECISIONS.md's 2026-08-30 entry: Vercel-
 * native backend, free tier, no accounts — a device-typed code is the
 * entire access model). Backed by Upstash Redis via Vercel's Marketplace
 * integration (Vercel's own KV/Postgres products were sunset in favor of
 * Neon/Upstash — see that decision's PR for the research). A flat
 * key→JSON-blob store fits this repo's save shape (sessionHistory.ts's
 * whole save is one small object) far better than provisioning a
 * relational schema for it.
 *
 * Uses Vercel's fetch-style Web handler (Request in, Response out) —
 * supported on the Node.js runtime since 2025 — rather than the classic
 * (req, res) shape, so this needs no @vercel/node dependency at all
 * (its current published types pull in several outdated, vulnerable
 * transitive packages for what would otherwise be types-only).
 */

// idiom-door keeps the original, un-namespaced prefix so every save
// written before per-game namespacing existed is still found where it
// was stored.
const REDIS_KEY_PREFIXES: Record<CloudSaveGame, string> = {
  "idiom-door": "chengyu-dao:cloud-save:",
  "science-snake": "chengyu-dao:science-snake:cloud-save:",
};

/** A missing game means idiom-door (older clients never send one); a
 * present but unknown one is rejected rather than silently defaulted,
 * so a typo can't quietly read or write another game's save. */
function resolveGame(game: unknown): CloudSaveGame | null {
  if (game === undefined || game === null) return DEFAULT_CLOUD_SAVE_GAME;
  return isValidCloudSaveGame(game) ? game : null;
}

function getRedis(): Redis | null {
  // Vercel's Upstash Redis integration has injected both naming
  // conventions across its history (KV_REST_API_* from the old built-in
  // Vercel KV product now proxied through Upstash, and the SDK's own
  // native UPSTASH_REDIS_REST_* names) — accepting either means this
  // doesn't depend on which one the currently-installed integration
  // happens to set.
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

function describeError(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export default {
  async fetch(request: Request): Promise<Response> {
    const redis = getRedis();
    // Not an error in the "something's broken" sense — this is the
    // expected state until the Upstash integration is actually
    // provisioned in the Vercel dashboard (DECISIONS.md's "Needs Your
    // Action" entry). cloudSync.ts on the client treats this
    // specifically as "cloud save isn't set up yet", not a failure.
    if (!redis) return json({ error: "not-configured" }, 501);

    if (request.method === "POST") {
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return json({ error: "invalid-body" }, 400);
      }
      const { code, data, game: rawGame } = (body ?? {}) as { code?: unknown; data?: unknown; game?: unknown };
      if (!isValidCloudSaveCode(code)) return json({ error: "invalid-code" }, 400);
      const game = resolveGame(rawGame);
      if (!game) return json({ error: "invalid-game" }, 400);
      if (!isValidCloudSavePayload(data)) return json({ error: "invalid-payload" }, 400);
      // A thrown Redis error (a timeout, a transient Upstash-side
      // failure) must still come back as *this endpoint's own* JSON
      // error shape rather than an uncaught exception — Vercel turns
      // an uncaught exception into a bare, body-less 500, which is
      // indistinguishable client-side from a genuine network outage
      // (cloudSync.ts's `detail` can only describe what's in the
      // response body). This is exactly the class of failure that hid
      // behind "Couldn't reach the cloud save server" — see
      // DECISIONS.md/BACKLOG.md's follow-up entry.
      try {
        await redis.set(REDIS_KEY_PREFIXES[game] + code, data);
      } catch (err) {
        return json({ error: `redis set failed: ${describeError(err)}` }, 500);
      }
      return json({ ok: true }, 200);
    }

    if (request.method === "GET") {
      const params = new URL(request.url).searchParams;
      const code = params.get("code");
      if (!isValidCloudSaveCode(code)) return json({ error: "invalid-code" }, 400);
      const game = resolveGame(params.get("game"));
      if (!game) return json({ error: "invalid-game" }, 400);
      let stored: unknown;
      try {
        stored = await redis.get(REDIS_KEY_PREFIXES[game] + code);
      } catch (err) {
        return json({ error: `redis get failed: ${describeError(err)}` }, 500);
      }
      if (stored == null) return json({ error: "not-found" }, 404);
      return json({ ok: true, data: stored }, 200);
    }

    return json({ error: "method-not-allowed" }, 405);
  },
};
