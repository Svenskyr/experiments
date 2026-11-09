import { createClient } from "@supabase/supabase-js";
import { PUBLIC_SUPABASE_URL } from "$app/env/public";
import { PRIVATE_SUPABASE_SECRET_KEY } from "$app/env/private";

export const supabase = createClient(PUBLIC_SUPABASE_URL, PRIVATE_SUPABASE_SECRET_KEY, {
    auth: {
        persistSession: false,
    },
    global: {
        headers: { Connection: "keep-alive" },
    },
});
