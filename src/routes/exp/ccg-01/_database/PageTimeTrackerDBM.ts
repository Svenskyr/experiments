import {
    noPayloadError,
    notReadyError,
    type PostgrestError,
} from "$exp/ccg-01/_syncHandler/v3/SyncHandlerActions.ts";
import { PageTimeRecord } from "$lib/common/PageTimeTracker/v2/PageTimeTracker.ts";
import {
    loadFromLocalStorage,
    saveToLocalStorage,
    SyncHandler,
} from "../_syncHandler/v3/SyncHandler.ts";

const storageKey = "exp_ccg_01:page-time-record";

export function load(): PageTimeRecord | null {
    const timesMs = loadFromLocalStorage<Record<string, number>>(storageKey);
    if (!timesMs) return null;
    const record = PageTimeRecord();
    record.timesMs = timesMs;
    return record;
}

export function save(record: PageTimeRecord): void {
    saveToLocalStorage<Record<string, number>>(storageKey, record.timesMs);
}

export function sync(syncHandler: SyncHandler): void {
    syncHandler.enqueue(storageKey, "submitPageTimeRecord");
}

export async function submit(
    syncHandler: SyncHandler,
    storageKey: string,
): Promise<{ data: unknown; error: PostgrestError | null }> {
    if (!syncHandler.ready || !syncHandler.db) {
        return { data: null, error: notReadyError() };
    }
    const payload = loadFromLocalStorage<PageTimeRecord>(storageKey);
    if (!payload) {
        return { data: null, error: noPayloadError(storageKey) };
    }
    const { data, error } = await syncHandler.db!
        .schema(syncHandler.scope)
        .from("sessions")
        .update({
            "page_time_record": payload,
        })
        .eq("session_id", syncHandler.sessionId)
        .select("session_id");
    if (!data || data.length === 0 || !data[0].session_id) {
        return {
            data: null,
            error: { message: "Session ID not found", code: "400" } as PostgrestError,
        };
    }
    if (error) {
        return { data: null, error: error };
    }
    return { data, error };
}
