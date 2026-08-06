import type { LayoutServerLoad } from "./$types";

// Supabase example
export const load: LayoutServerLoad = async (
    { locals: { safeGetSession } },
) => {
    const { supabaseSession, supabaseUser } = await safeGetSession();

    return {
        supabaseSession,
        supabaseUser,
    };
};
