import { redirect } from "@sveltejs/kit";
import { setStateCookie, verifyStateCookie } from "#lib/exp/state/v1/Cookie.server.ts";
import { newExpState } from "#lib/exp/state/v1/ExperimentState.ts";
import { stateCookie } from "#exp/dg-01/experiment.server.ts";
import { BASE_PATH } from "#exp/dg-01/experiment.ts";
import type { LayoutServerLoad } from "./$types";

// DRAFT: no platform claims and no activity expiry yet (see ccg-01/+layout.server.ts).
export const load: LayoutServerLoad = async ({ cookies, url, locals: { log } }) => {
    const config = stateCookie();
    let { expState, valid } = await verifyStateCookie(config, cookies);

    if (!expState || !valid) {
        if (expState) log.warn("Invalid state cookie; redirecting to gate with new expState");
        expState = newExpState(url);
        // DRAFT: a random participant key. Registration will set the database session ID.
        expState.session.sessionId = crypto.randomUUID();
        expState.session.lastActiveAt = Date.now();
        await setStateCookie(config, cookies, expState);
        if (url.pathname !== BASE_PATH) redirect(303, `${BASE_PATH}${url.search}`);
    }

    return { expState };
};
