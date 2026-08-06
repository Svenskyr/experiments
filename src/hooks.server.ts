import { PUBLIC_SUPABASE_PUBLIC_KEY, PUBLIC_SUPABASE_URL } from "$env/static/public";
import { createServerClient } from "@supabase/ssr";
import type { Handle } from "@sveltejs/kit";
import { logger } from "$lib/server/logger.server.ts";

export const handle: Handle = async ({ event, resolve }) => {
    event.locals.log = logger.child({
        requestId: crypto.randomUUID(),
        // method: event.request.method,
        path: event.url.pathname,
    });

    event.locals.supabase = createServerClient(
        PUBLIC_SUPABASE_URL,
        PUBLIC_SUPABASE_PUBLIC_KEY,
        {
            cookies: {
                getAll() {
                    return event.cookies.getAll();
                },
                setAll(cookiesToSet, headers) {
                    /**
                     * Note: You have to add the `path` variable to the
                     * set and remove method due to sveltekit's cookie API
                     * requiring this to be set, setting the path to an empty string
                     * will replicate previous/standard behavior (https://kit.svelte.dev/docs/types#public-types-cookies)
                     */
                    cookiesToSet.forEach(({ name, value, options }) =>
                        event.cookies.set(name, value, { ...options, path: "/" })
                    );
                    if (Object.keys(headers).length > 0) {
                        event.setHeaders(headers);
                    }
                },
            },
        },
    );

    /**
     * Unlike `supabase.auth.getSession()`, which returns the session _without_
     * validating the JWT, this function also calls `getUser()` to validate the
     * JWT before returning the session.
     */
    event.locals.safeGetSession = async () => {
        const {
            data: { session: supabaseSession },
        } = await event.locals.supabase.auth.getSession();
        if (!supabaseSession) {
            return { supabaseSession: null, supabaseUser: null };
        }

        const {
            data: { user: supabaseUser },
            error,
        } = await event.locals.supabase.auth.getUser();
        if (error) {
            // JWT validation has failed
            return { supabaseSession: null, supabaseUser: null };
        }

        return { supabaseSession, supabaseUser };
    };

    // const start = performance.now();

    const response = await resolve(event, {
        filterSerializedResponseHeaders(name) {
            return name === "content-range" || name === "x-supabase-api-version";
        },
    });

    // event.locals.log.info({
    //     status: response.status,
    //     durationMs: Math.round(performance.now() - start),
    // }, "request");

    return response;
};
