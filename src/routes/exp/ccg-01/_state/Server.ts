import { setStateCookie, validateStateCookieOrRedirect } from "./Cookie.ts";
import type { Cookies } from "@sveltejs/kit";
import type { PageName } from "./Pages.ts";
import type { ExperimentState } from "./ExperimentState.ts";

export async function setNextPageCookie(
    cookies: Cookies,
    complete: PageName[],
    grant: PageName[],
    revoke: PageName[],
): Promise<{ expState: ExperimentState }> {
    const { expState } = await validateStateCookieOrRedirect(cookies);

    if (complete.length > 0) {
        for (const page of complete) {
            expState.pages[page] ??= { completed: false, permitted: false };
            expState.pages[page].completed = true;
        }
    }

    if (grant.length > 0) {
        for (const page of grant) {
            expState.pages[page] ??= { completed: false, permitted: false };
            expState.pages[page].permitted = true;
        }
    }

    if (revoke.length > 0) {
        for (const page of revoke) {
            expState.pages[page] ??= { completed: false, permitted: false };
            expState.pages[page].permitted = false;
        }
    }

    expState.session.lastActiveAt = Date.now();
    await setStateCookie(cookies, expState);
    return { expState };
}
