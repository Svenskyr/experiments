import { verifyProlificSession } from "./prolific.ts";
import type { PlatformParticipantClaims } from "./PlatformClaims.ts";

export interface PlatformVerificationResult {
    success: boolean;
    error: string | null;
    httpStatus: number | null;
}

export async function verifyPlatformClaims(
    claim: PlatformParticipantClaims,
): Promise<PlatformVerificationResult> {
    switch (claim.platform) {
        case "test-pass":
            return { success: true, error: null, httpStatus: null };
        case "test-fail":
            return {
                success: false,
                error: "platform=test-fail: unconditional fail",
                httpStatus: null,
            };
        case "prolific": {
            const { success, error, httpStatus } = await verifyProlificSession(claim);
            return { success, error, httpStatus };
        }
        default:
            return {
                success: false,
                error: `Unsupported platform: ${claim.platform}`,
                httpStatus: null,
            };
    }
}

export function resolvePlatformAfterVerification(claimPlatform: string, verified: boolean): string {
    if (claimPlatform === "prolific") {
        return verified ? "prolific" : "prolific-verification-failed";
    }
    return claimPlatform;
}
