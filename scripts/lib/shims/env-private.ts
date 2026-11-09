const serviceKey = process.env["PRIVATE_SUPABASE_SERVICE_KEY"]
    ?? process.env["PRIVATE_SUPABASE_SECRET_KEY"]
    ?? "";

export const PRIVATE_SUPABASE_SECRET_KEY = serviceKey;
export const PRIVATE_CCG_01_SECRET_KEY = process.env["PRIVATE_CCG_01_SECRET_KEY"] ?? "";
