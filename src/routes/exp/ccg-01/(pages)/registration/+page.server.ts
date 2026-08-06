import { type Cookies, error, fail } from "@sveltejs/kit";
import {
    setStateCookie,
    validateStateCookieOrRedirect,
} from "$experiments/ccg-01/_state/Cookie.ts";
import {
    EXPERIMENT_ID,
    registerForExperiment,
    type RegistrationRequest,
} from "$experiments/ccg-01/_database/Registration.ts";

export const actions = {
    registerForExperiment: async (
        { cookies, request, locals }: { cookies: Cookies; request: Request; locals: App.Locals },
    ) => {
        const { expState } = await validateStateCookieOrRedirect(cookies);
        const { supabaseUser } = await locals.safeGetSession();
        if (!supabaseUser) {
            return error(400, "No supabase session");
        }

        const formData = await request.formData();
        const pid = formData.get("PID") as string | null;
        const role = (formData.get("role") as string | null) ?? "unspecified";
        if (!pid) return error(400, "PID is required");

        const registrationRequest: RegistrationRequest = {
            experiment_id: EXPERIMENT_ID,
            auth_id: supabaseUser.id,
            pid,
            source: expState.user.source ?? "",
            platform: expState.user.platform ?? "",
            platform_session_id: expState.session.platformSessionId ?? "",
            role,
        };

        const { userId, sessionId, error: registrationError } = await registerForExperiment(
            registrationRequest,
        );
        if (registrationError || !userId || !sessionId) {
            return error(400, registrationError ?? "Registration failed");
        }

        expState.user.authUserId = supabaseUser.id;
        expState.user.pid = pid;
        expState.user.userId = userId;
        expState.session.sessionId = sessionId;
        expState.session.role = role;

        expState.pages.registration = { permitted: false, completed: true };
        expState.pages.game_description_1 ??= { permitted: true, completed: false };

        await setStateCookie(cookies, expState);
        return { success: true, expState, userId, sessionId };
    },
};
