import { redirect } from "@sveltejs/kit";
import { setStateCookie } from "#lib/exp/state/v1/Cookie.server.ts";
import { maxPage, pagePath } from "#lib/exp/state/v1/Pages.ts";
import { stateCookie } from "#exp/dg-01/experiment.server.ts";
import { EXPERIMENT } from "#exp/dg-01/experiment.ts";
import type { PageServerLoad } from "./$types";

// DRAFT gate: no quota check and no platform verification. Everyone continues to the study.
export const load: PageServerLoad = async ({ parent, cookies }) => {
    const { expState } = await parent();
    expState.pages.consent ??= { permitted: true, completed: false };
    await setStateCookie(stateCookie(), cookies, expState);
    redirect(303, pagePath(EXPERIMENT, maxPage(EXPERIMENT, expState.pages)));
};
