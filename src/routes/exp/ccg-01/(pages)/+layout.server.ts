import type { LayoutServerLoad } from "./$types";
import { redirect } from "@sveltejs/kit";
import type { PageName } from "../_state/Pages.ts";
import { pageNameFromRoute } from "../_state/Pages.ts";
import { maxPage } from "$exp/ccg-01/_state/Pages.ts";
export const load: LayoutServerLoad = async (
    { url, locals: { log }, parent },
) => {
    const { expState } = await parent();

    const requestedPageName: PageName = pageNameFromRoute(url.pathname);
    const permitted = expState.pages[requestedPageName]?.permitted;

    if (!permitted) {
        return redirect(303, `/experiments/ccg-01/${maxPage(expState.pages)}`);
    }
};
