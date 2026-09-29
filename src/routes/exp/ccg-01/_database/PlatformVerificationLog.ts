import { supabase } from "./ServiceRole.ts";
import { getLogger } from "$lib/server/logger.server.ts";

export interface PlatformVerificationLogRequest {
    experiment_id: string;
    claim_platform: string;
    resolved_platform: string;
    study_id: string;
    pid: string;
    platform_session_id: string;
    role: string;
    success: boolean;
    error: string | null;
    http_status: number | null;
    experiments_session_id: string | null;
}

export async function logPlatformVerification(
    request: PlatformVerificationLogRequest,
): Promise<void> {
    const log = getLogger({ mod: "exp/ccg-01/PlatformVerificationLog" });
    const { error } = await supabase.schema("experiments").rpc("log_platform_verification", {
        p_experiment_id: request.experiment_id,
        p_claim_platform: request.claim_platform,
        p_resolved_platform: request.resolved_platform,
        p_study_id: request.study_id,
        p_pid: request.pid,
        p_platform_session_id: request.platform_session_id,
        p_role: request.role,
        p_success: request.success,
        p_error: request.error,
        p_http_status: request.http_status,
        p_experiments_session_id: request.experiments_session_id,
    });
    if (error) {
        log.error({ error, request }, "Failed to log platform verification");
    }
}
