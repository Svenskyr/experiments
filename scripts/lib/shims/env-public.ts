export const PUBLIC_SUPABASE_URL = process.env["PUBLIC_SUPABASE_URL"] ?? "http://127.0.0.1:64321";
export const PUBLIC_SUPABASE_PUB_KEY = process.env["PUBLIC_SUPABASE_PUB_KEY"]
    ?? process.env["PUBLIC_SUPABASE_PUBLIC_KEY"]
    ?? "";
export const PUBLIC_SUPABASE_PUBLIC_KEY = PUBLIC_SUPABASE_PUB_KEY;
export const PUBLIC_TURNSTILE_SITE_KEY = process.env["PUBLIC_TURNSTILE_SITE_KEY"] ?? "";
