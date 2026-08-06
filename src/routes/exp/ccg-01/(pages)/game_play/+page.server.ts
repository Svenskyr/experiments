import type { Cookies } from "@sveltejs/kit";
import { setNextPageCookie } from "$exp/ccg-01/_state/Server.ts";
import type { PageName } from "$exp/ccg-01/_state/Pages.ts";
export const actions = {
    requestNextPageCookie: async (
        { cookies }: { cookies: Cookies },
    ) => {
        const complete: PageName[] = ["game_play"];
        const grant: PageName[] = ["survey"];
        const revoke: PageName[] = ["game_play"];
        const { expState } = await setNextPageCookie(cookies, complete, grant, revoke);
        // Page uses goto() instead of redirect() because we want to use replaceState: true.
        return { expState };
    },
};
