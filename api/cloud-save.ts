import { Redis } from "@upstash/redis";
import { isValidCloudSaveCode, isValidCloudSavePayload } from "../src/shared/cloudSaveValidation";

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

const REDIS_KEY_PREFIX = "chengyu-dao:cloud-save:";

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
      const { code, data } = (body ?? {}) as { code?: unknown; data?: unknown };
      if (!isValidCloudSaveCode(code)) return json({ error: "invalid-code" }, 400);
      if (!isValidCloudSavePayload(data)) return json({ error: "invalid-payload" }, 400);
      await redis.set(REDIS_KEY_PREFIX + code, data);
      return json({ ok: true }, 200);
    }

    if (request.method === "GET") {
      const code = new URL(request.url).searchParams.get("code");
      if (!isValidCloudSaveCode(code)) return json({ error: "invalid-code" }, 400);
      const stored = await redis.get(REDIS_KEY_PREFIX + code);
      if (stored == null) return json({ error: "not-found" }, 404);
      return json({ ok: true, data: stored }, 200);
    }

    return json({ error: "method-not-allowed" }, 405);
  },
};
