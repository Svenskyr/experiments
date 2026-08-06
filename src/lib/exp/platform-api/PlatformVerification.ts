import { verifyProlificSession } from "./prolific.ts";
import type { PlatformParticipantClaims } from "./PlatformClaims.ts";

export async function verifyPlatformClaims(
    claim: PlatformParticipantClaims,
): Promise<{ success: boolean; error: string | null }> {
    switch (claim.platform) {
        case "test-pass":
            return { success: true, error: null };
        case "test-fail":
            return { success: false, error: "platform=test-fail: unconditional fail" };
        case "prolific":
            const { success, error } = await verifyProlificSession(claim);
            return { success, error };
        default:
            return { success: false, error: `Unsupported platform: ${claim.platform}` };
    }
}
