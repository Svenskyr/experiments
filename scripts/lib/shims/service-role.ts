import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "../../ccg-01-test-session.ts";

let client: SupabaseClient | undefined;

function getClient(): SupabaseClient {
    if (!client) client = createServiceClient();
    return client;
}

export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
    get(_target, prop, receiver) {
        const value = Reflect.get(getClient(), prop, receiver);
        return typeof value === "function" ? value.bind(getClient()) : value;
    },
});
