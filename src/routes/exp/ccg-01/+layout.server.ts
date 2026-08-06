import type { LayoutServerLoad } from "./$types";
import { setStateCookie, verifyStateCookie } from "$exp/ccg-01/_state/Cookie.ts";
import { newExpState } from "$exp/ccg-01/_state/ExperimentState.ts";
import { redirect } from "@sveltejs/kit";
import {
    readPlatformParticipantClaims,
    reconcileClaimWithExpState,
} from "$lib/exp/platform-api/PlatformClaims.ts";
export const load: LayoutServerLoad = async (
    { cookies, url, locals: { log } },
) => {
    let { expState, valid, expired } = await verifyStateCookie(cookies);
    if (!expState || !valid) {
        if (!expState) {
            log.info("No state cookie found; redirecting to gate with new expState");
        } else if (!valid) {
            log.warn("Invalid state cookie; redirecting to gate with new expState");
        }
        expState = newExpState(url);
        await setStateCookie(cookies, expState);
        if (url.pathname !== "/exp/ccg-01") {
            return redirect(303, `/exp/ccg-01${url.search}`);
        }
    }
    log.debug({ expState }, "ccg-01/+layout.server.ts: load");

    const claims = readPlatformParticipantClaims(url);
    const agreement: Boolean | null = claims.valid
        ? await reconcileClaimWithExpState(claims, expState)
        : null;

    // Claim and expState disagree: New state cookie; redirect to gate with claims in url params.
    if (agreement === false) {
        log.warn({ claims, expState }, "Claim and expState disagree");
        expState = newExpState(url);
        await setStateCookie(cookies, expState);
        if (url.pathname !== "/exp/ccg-01") {
            return redirect(303, `/exp/ccg-01${url.search}`);
        }
    }

    // Expired participant: Recheck quota at gate.
    if (expired && expState.session.role === "participant") {
        log.warn(
            "Expired participant state cookie; redirecting to gate page for quota recheck",
        );
        expState.session.withinQuota = undefined;
        expState.session.lastActiveAt = Date.now();
        await setStateCookie(cookies, expState);
        return redirect(303, `/exp/ccg-01`);
    }

    return { expState, claims };
};

// - yes valid claim, no state cookie: goto quota, preserving claim in url params.
// - yes valid claim, yes state cookie, disagree: goto quota, preserving claim in url params.
// - yes valid claim, yes state cookie, agree: continue.
// - no valid claim: not a platform participant; continue.
