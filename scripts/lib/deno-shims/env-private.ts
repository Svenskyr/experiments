const serviceKey = Deno.env.get("PRIVATE_SUPABASE_SERVICE_KEY")
    ?? Deno.env.get("PRIVATE_SUPABASE_SECRET_KEY")
    ?? "";

export const PRIVATE_SUPABASE_SECRET_KEY = serviceKey;
export const PRIVATE_CCG_01_SECRET_KEY = Deno.env.get("PRIVATE_CCG_01_SECRET_KEY") ?? "";
