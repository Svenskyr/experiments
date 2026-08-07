import type { Actions, PageServerLoad } from "./$types";
import { clearStateCookie, validateStateCookieOrRedirect } from "$exp/ccg-01/_state/Cookie.ts";
import { supabase } from "$exp/ccg-01/_database/ServiceRole.ts";
import { getLogger } from "$lib/server/logger.server.ts";

async function isSessionCompleted(sessionId: string): Promise<boolean> {
    const { data, error } = await supabase
        .schema("experiments")
        .from("sessions")
        .select("status")
        .eq("session_id", sessionId)
        .maybeSingle();

    if (error || !data) return false;
    return data.status === "completed";
}

export const load: PageServerLoad = async ({ parent }) => {
    const { expState } = await parent();
    const sessionId = expState.session.sessionId;
    if (!sessionId) {
        return { sessionCompleted: false };
    }
    const sessionCompleted = await isSessionCompleted(sessionId);
    return { sessionCompleted };
};

export const actions = {
    finalizeClientSession: async ({ cookies }) => {
        const log = getLogger({ mod: "exp/ccg-01/end/", fn: "finalizeClientSession" });
        const { expState } = await validateStateCookieOrRedirect(cookies);
        const sessionId = expState.session.sessionId;
        if (!sessionId) {
            return { ok: false as const, sessionCompleted: false as const };
        }

        const sessionCompleted = await isSessionCompleted(sessionId);
        if (!sessionCompleted) {
            return { ok: false as const, sessionCompleted: false as const };
        }

        clearStateCookie(cookies);
        log.info({ sessionId }, "Cleared experiment state cookie after session completion");
        return { ok: true as const, sessionCompleted: true as const };
    },
} satisfies Actions;
