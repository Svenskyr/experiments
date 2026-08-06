import type { ExperimentState } from "$exp/ccg-01/_state/ExperimentState.ts";
import { fetchQuotaData, requestSessionReactivation } from "$exp/ccg-01/_database/Quota.ts";
import { redirect } from "@sveltejs/kit";
import { maxPage } from "$exp/ccg-01/_state/Pages.ts";
import { setStateCookie } from "$exp/ccg-01/_state/Cookie.ts";
import type { Cookies } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { verifyStateCookie } from "$exp/ccg-01/_state/Cookie.ts";
import { verifyPlatformClaims } from "$lib/exp/platform-api/PlatformVerification.ts";
import { resolvePlatformParticipantClaims } from "$lib/exp/platform-api/PlatformClaims.ts";
import { getLogger } from "$lib/server/logger.server.ts";
const quotaRoles = ["participant", "over-quota", "over-quota-buffer"];

export const load: PageServerLoad = async ({ parent, cookies }) => {
    // Continue to gate if:
    // - new entry: claims.valid
    // - OR expired entry: expState.session.role === participant && expState.session.withinQuota is undefined
    const { expState, claims } = await parent();

    const skipGate = expState.session.role !== "participant"
        || (
            expState.session.role === "participant"
            && expState.session.withinQuota === true
        );

    if (skipGate) {
        expState.pages.consent ??= { permitted: true, completed: false };
        await setStateCookie(cookies, expState);
        return redirect(303, `/exp/ccg-01/${maxPage(expState.pages)}`);
    }
};

export const actions = {
    checkQuotaAndVerifyPlatformClaim: async (
        { cookies, request, url }: { cookies: Cookies; request: Request; url: URL },
    ) => {
        const log = getLogger({ mod: "exp/ccg-01/" });
        let { expState, valid, expired } = await verifyStateCookie(cookies);
        if (!expState) return { error: "No state cookie" };
        if (!valid) return { error: "Invalid state cookie" };
        if (expired) {
            const awaitingQuotaRecheck = expState.session.role === "participant"
                && expState.session.withinQuota === undefined;
            if (!awaitingQuotaRecheck) {
                return { error: "Expired state cookie" };
            }
            expState.session.lastActiveAt = Date.now();
            await setStateCookie(cookies, expState);
        }

        const formData = await request.formData();
        const claimString = formData.get("claimString");
        if (typeof claimString !== "string") {
            return { error: "Missing claimString" };
        }
        let claims = JSON.parse(claimString);
        if (!claims.valid) {
            claims = resolvePlatformParticipantClaims(url, expState);
        }
        if (!claims.valid) {
            return { error: "Missing platform participant claims" };
        }

        log.debug({ claims }, "checkQuotaAndVerifyPlatformClaim");
        const { success: verificationSuccess, error: verificationError } =
            await verifyPlatformClaims(
                claims,
            );

        let withinQuota: boolean;
        let role: string;
        let quotaError: string | null;

        if (verificationSuccess && !verificationError) {
            const isReturning = Boolean(expState.session.sessionId);
            if (isReturning) {
                const reactivation = await requestSessionReactivation(expState.session.sessionId!);
                if (reactivation.success) {
                    withinQuota = true;
                    role = "participant";
                    quotaError = null;
                } else {
                    const quotaResult = await checkQuota();
                    withinQuota = false;
                    role = quotaResult.role;
                    quotaError = reactivation.error ?? quotaResult.error;
                }
            } else {
                ({ withinQuota, role, error: quotaError } = await checkQuota());
            }
        } else {
            withinQuota = false;
            role = "failed-platform-verification";
            quotaError = null;
        }

        log.debug(
            { withinQuota, role, verificationSuccess, verificationError },
            "checkQuotaAndVerifyPlatformClaim",
        );

        if (verificationSuccess && !verificationError) {
            expState.user.studyId = claims.studyId;
            expState.user.platform = claims.platform;
            expState.user.pid = claims.pid;
            expState.session.platformSessionId = claims.platformSessionId;
            expState.session.role = role;
            expState.session.withinQuota = withinQuota;
            expState.session.lastActiveAt = Date.now();
            if (expState.session.sessionId) {
                if (!withinQuota) expState.pages = {};
            } else {
                expState.pages.consent = { permitted: withinQuota, completed: false };
                if (!withinQuota) expState.pages = {};
            }
        } else {
            expState.session.role = "failed-platform-verification";
            expState.session.withinQuota = false;
            expState.pages = {};
        }

        await setStateCookie(cookies, expState);
        return { expState, quotaError, verificationError };
    },

    downgradeParticipant: async ({ cookies }: { cookies: Cookies }) => {
        const { expState, valid } = await verifyStateCookie(cookies);
        if (!expState || !valid) return { error: "Invalid state cookie" };

        if (!quotaRoles.includes(expState.session.role ?? "")) {
            return { error: "non-quota role; downgrade unnecessary" };
        }

        if (expState.session.withinQuota !== false) {
            return { error: "downgrade only applicable when over quota" };
        }

        expState.pages = {
            consent: { permitted: true, completed: false },
        };

        expState.session.role = "downgraded";
        expState.session.withinQuota = undefined;

        await setStateCookie(cookies, expState);
        return redirect(303, `/exp/ccg-01/${maxPage(expState.pages)}`);
    },
};

async function checkQuota(): Promise<{ withinQuota: boolean; role: string; error: string | null }> {
    const log = getLogger({ mod: "exp/ccg-01/" });
    const quotaData = await fetchQuotaData();
    if (!quotaData) {
        return {
            withinQuota: false,
            role: "failed-quota-fetch",
            error: "Failed to fetch quota data",
        };
    }
    if (quotaData.participants_completed >= quotaData.quota) {
        return { withinQuota: false, role: "over-quota", error: "Quota exceeded" };
    }
    log.debug({ quotaData }, "checkQuota");
    if (
        quotaData.participants_completed + quotaData.participants_in_progress
            >= quotaData.quota + quotaData.quota_buffer
    ) {
        return { withinQuota: false, role: "over-quota-buffer", error: "Quota buffer exceeded" };
    }
    return { withinQuota: true, role: "participant", error: null };
}

async function testQuotaStatus(
    cookies: Cookies,
    expState: ExperimentState,
    withinQuota: boolean,
): Promise<{ expState: ExperimentState }> {
    expState.session.role = withinQuota ? "participant" : "over-quota";
    expState.session.withinQuota = withinQuota;
    expState.pages.quota = { permitted: !withinQuota, completed: withinQuota };
    expState.pages.consent = { permitted: withinQuota, completed: false };
    await setStateCookie(cookies, expState);
    return { expState };
}
