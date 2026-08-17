import type { ExperimentState as ccg01ExpState } from "$exp/ccg-01/_state/ExperimentState.ts";
import { getSearchParam } from "$lib/exp/urlParams.ts";
// import { getLogger } from "$lib/server/logger.server.ts";

export interface PlatformParticipantClaims {
    studyId: string;
    role: string;
    platform: string;
    pid: string;
    platformSessionId: string;
    valid: boolean;
}

export function resolvePlatformParticipantClaims(
    url: URL,
    expState: ccg01ExpState,
): PlatformParticipantClaims {
    const urlClaims = readPlatformParticipantClaims(url);
    if (urlClaims.valid) return urlClaims;

    const claim: PlatformParticipantClaims = {
        studyId: urlClaims.studyId || expState.user.studyId || "",
        role: expState.session.role ?? "",
        platform: expState.user.platform ?? "",
        pid: expState.user.pid ?? "",
        platformSessionId: expState.session.platformSessionId ?? "",
        valid: false,
    };
    claim.valid = Object.values(claim).every((value) => value !== "");
    return claim;
}

export function readPlatformParticipantClaims(url: URL): PlatformParticipantClaims {
    const claim: PlatformParticipantClaims = {
        studyId: getSearchParam(url, "study_id") ?? "",
        role: getSearchParam(url, "role") ?? "",
        platform: getSearchParam(url, "platform") ?? "",
        pid: getSearchParam(url, "pid") ?? "",
        platformSessionId: getSearchParam(url, "p_session_id") ?? "",
        valid: false,
    };
    claim.valid = Object.values(claim).every((value) => value !== "");
    return claim;
}

export async function reconcileClaimWithExpState(
    claim: PlatformParticipantClaims,
    expState: ccg01ExpState,
): Promise<boolean> {
    return claim.role === expState.session.role
        && claim.platform === expState.user.platform
        && claim.pid === expState.user.pid
        && claim.platformSessionId === expState.session.platformSessionId;
}
