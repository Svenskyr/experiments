import type { Cookies } from "@sveltejs/kit";
import { setNextPageCookie } from "#lib/exp/state/v1/Cookie.server.ts";
import { stateCookie } from "#exp/dg-01/experiment.server.ts";
import type { PageName } from "#exp/dg-01/experiment.ts";

export const actions = {
    requestNextPageCookie: async ({ cookies }: { cookies: Cookies }) => {
        const complete: PageName[] = ["consent"];
        const grant: PageName[] = ["avatar"];
        const revoke: PageName[] = [];
        const { expState } = await setNextPageCookie(
            stateCookie(),
            cookies,
            complete,
            grant,
            revoke,
        );
        return { expState };
    },
};
