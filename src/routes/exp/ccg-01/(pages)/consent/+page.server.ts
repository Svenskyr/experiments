import type { Cookies } from "@sveltejs/kit";
import { setStateCookie, validateStateCookieOrRedirect } from "$exp/ccg-01/_state/Cookie.ts";

export const actions = {
    submitConsent: async (
        { cookies }: { cookies: Cookies },
    ) => {
        const { expState } = await validateStateCookieOrRedirect(cookies);
        expState.pages.consent = { permitted: true, completed: true };
        expState.pages.registration ??= { permitted: true, completed: false };
        expState.session.lastActiveAt = Date.now();
        await setStateCookie(cookies, expState);
        return { expState };
    },
};
