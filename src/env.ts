import { defineEnvVars } from "@sveltejs/kit/env";

/**
 * Environment variables (https://svelte.dev/docs/kit/environment-variables).
 *
 * - Public values are static: inlined into the bundle at build time.
 * - Private values are dynamic: read at runtime, so they must be set in the
 *   Cloudflare Worker as secrets (`wrangler secret put`), not only at build time.
 */
export const variables = defineEnvVars({
    PUBLIC_SUPABASE_URL: { public: true, static: true },
    PUBLIC_SUPABASE_PUBLIC_KEY: { public: true, static: true },
    PUBLIC_TURNSTILE_SITE_KEY: { public: true, static: true },

    PRIVATE_SUPABASE_SECRET_KEY: { description: "Supabase service role key (server only)" },
    PRIVATE_CCG_01_SECRET_KEY: { description: "HMAC key for the ccg-01 state cookie" },
    PRIVATE_PROLIFIC_API_KEY: { description: "Prolific API key for platform verification" },
});
