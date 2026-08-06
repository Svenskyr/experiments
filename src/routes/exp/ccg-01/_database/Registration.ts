import { supabase } from "./ServiceRole.ts";

export const EXPERIMENT_ID = "exp_ccg_01";

export interface RegistrationRequest {
    experiment_id: string;
    auth_id: string;
    pid: string;
    source: string;
    platform: string;
    platform_session_id: string;
    role: string;
}

export const registerForExperiment = async (
    request: RegistrationRequest,
): Promise<{ userId: string | null; sessionId: string | null; error: string | null }> => {
    const { data, error } = await supabase
        .schema("experiments")
        .rpc("register_for_experiment", { p_request: request })
        .single<{ user_id: string | null; session_id: string | null }>();
    if (error) return { userId: null, sessionId: null, error: error.message };
    return { userId: data.user_id, sessionId: data.session_id, error: null };
};

// export const fetchQuotaData = async (): Promise<QuotaData> => {
//     const { data, error } = await supabase
//         .schema("experiments")
//         .rpc("get_fresh_quota_data")
//         .single<QuotaData>();
//     if (error) throw error;
//     if (!data) throw new Error("Experiment quota data not found");
//     return data;
// };
