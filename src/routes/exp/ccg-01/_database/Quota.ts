import { getLogger } from "$lib/server/logger.server.ts";
import { supabase } from "./ServiceRole.ts";

interface QuotaData {
    within_quota: boolean;
    quota: number;
    quota_buffer: number;
    participants_in_progress: number;
    participants_completed: number;
}

export const fetchQuotaData = async (): Promise<QuotaData | null> => {
    const log = getLogger({ mod: "exp/ccg-01/" });
    const { data, error } = await supabase
        .schema("experiments")
        .rpc("get_fresh_quota_data", { p_experiment_id: "exp_ccg_01", p_new_admission: true })
        .single<QuotaData>();
    if (error) {
        log.error({ error }, "fetchQuotaData");
    }
    return data ?? null;
};

export const requestSessionReactivation = async (
    sessionId: string,
): Promise<{ success: boolean; error: string | null }> => {
    const log = getLogger({ mod: "exp/ccg-01/" });
    const { data, error } = await supabase
        .schema("experiments")
        .rpc("request_session_reactivation", { p_session_id: sessionId });

    if (error) {
        log.error({ error, sessionId }, "requestSessionReactivation");
        return { success: false, error: error.message };
    }
    if (data !== true) {
        return { success: false, error: "Study quota has been reached" };
    }
    return { success: true, error: null };
};

// export async function updateQuotaStatus(
//     authUserId: string,
//     withinQuota: boolean,
//     role: string,
// ): Promise<{ success: boolean; error: Error | null }> {
//     const { error } = await supabase
//         .schema("exp_ccg_01")
//         .from("participants")
//         .update({ role, status: withinQuota ? "in_progress" : "over_quota" })
//         .eq("auth_user_id", authUserId);
//     return { success: !error, error: error ?? null };
// }
