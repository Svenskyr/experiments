import { detectUserAgent } from "$lib/common/UserAgent/UserAgentDetection.ts";
import {
    noPayloadError,
    notReadyError,
    type PostgrestError,
} from "$exp/ccg-01/_syncHandler/v3/SyncHandlerActions.ts";
import {
    loadFromLocalStorage,
    saveToLocalStorage,
    type SyncHandler,
} from "../_syncHandler/v3/SyncHandler.ts";

const storageKey = "exp_ccg_01:user-agent";

export type UserAgentPayload = ReturnType<typeof detectUserAgent>;

export function save(): void {
    saveToLocalStorage(storageKey, detectUserAgent());
}

export function sync(syncHandler: SyncHandler): void {
    syncHandler.enqueue(storageKey, "submitUserAgent");
}

export async function submit(
    syncHandler: SyncHandler,
    key: string,
): Promise<{ data: unknown; error: PostgrestError | null }> {
    if (!syncHandler.ready || !syncHandler.db || !syncHandler.sessionId) {
        return { data: null, error: notReadyError() };
    }
    const payload = loadFromLocalStorage<UserAgentPayload>(key);
    if (!payload) {
        return { data: null, error: noPayloadError(key) };
    }
    const { data, error } = await syncHandler.db
        .schema("experiments")
        .from("sessions")
        .update({ user_agent: payload })
        .eq("session_id", syncHandler.sessionId)
        .select("session_id");
    if (error) {
        return { data: null, error };
    }
    if (!data || data.length === 0 || !data[0].session_id) {
        return {
            data: null,
            error: { message: "Session ID not found", code: "400" } as PostgrestError,
        };
    }
    return { data, error: null };
}
