import type { Cookies } from "@sveltejs/kit";
import { setNextPageCookie } from "$exp/ccg-01/_state/Server.ts";
import type { PageName } from "$exp/ccg-01/_state/Pages.ts";
export const actions = {
    // pageCompleted: async (
    //     { cookies, request }: { cookies: Cookies; request: Request },
    // ): Promise<{ success: boolean }> => {
    //     const stateString = cookies.get(STATE_COOKIE_NAME);
    //     if (!stateString) return redirect(303, "experiments/ccg-01/consent");
    //     const expState = JSON.parse(stateString);
    //     const { valid, expired } = await verifyStateCookie(expState);
    //     if (!valid) return { success: false };
    //     if (expired) {
    //         expState.user.withinQuota = undefined;
    //         await setStateCookie(cookies, expState);
    //         return redirect(303, "/experiments/ccg-01/quota");
    //     }
    //     const currentPage = expState.pages.find((p: PageState) => p.name === "game_play")!;
    //     currentPage.completed = true;
    //     currentPage.permitted = false;
    //     const nextIndex = expState.pages.findIndex((page: PageState) => page.name === "game_play") +
    //         1;
    //     const nextPage = expState.pages[nextIndex];
    //     nextPage.permitted = true;
    //     await setStateCookie(cookies, expState);
    //     return redirect(303, `/experiments/ccg-01/${nextPage.name}`);
    // },
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
