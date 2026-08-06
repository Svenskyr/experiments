import debugLib from "debug";
const debug = debugLib("ccg-01:_database:Feedback");
import type { FeedbackData } from "$lib/common/Feedback/v4/Feedback";
import type { SyncHandler } from "$exp/ccg-01/_syncHandler/v3/SyncHandler";
import { loadFromLocalStorage, saveToLocalStorage } from "$exp/ccg-01/_syncHandler/v3/SyncHandler";
import {
    noPayloadError,
    notReadyError,
    type PostgrestError,
} from "../_syncHandler/v3/SyncHandlerActions.ts";
const storageKey = (page: string, label: string) => `exp_ccg_01:feedback:${page}:${label}`;

export function load(page: string, label: string): FeedbackData | null {
    const data = loadFromLocalStorage<FeedbackData>(storageKey(page, label));
    return data ?? null;
}

export function save(data: FeedbackData) {
    const strippedData = stripFeedbackData(data);
    saveToLocalStorage(storageKey(data.page, data.label), strippedData);
}

export function sync(syncHandler: SyncHandler, data: FeedbackData) {
    syncHandler.enqueue(storageKey(data.page, data.label), "submitFeedback");
}

export async function submit(
    syncHandler: SyncHandler,
    storageKey: string,
): Promise<{ data: unknown; error: unknown }> {
    if (!syncHandler.ready || !syncHandler.db) {
        return { data: null, error: notReadyError() };
    }
    const data = loadFromLocalStorage<FeedbackData>(storageKey);
    if (!data) {
        return { data: null, error: noPayloadError(storageKey) };
    }
    syncHandler.debug(`Submitting feedback data for ${storageKey}`);
    const { data: dbData, error } = await syncHandler.db
        .schema(syncHandler.scope)
        .from("feedback")
        .upsert({
            session_id: syncHandler.sessionId,
            page: data.page,
            label: data.label,
            ratings: data.ratings,
            comments: data.comments,
        })
        .eq("auth_user_id", syncHandler.authUserId);
    if (error) {
        debug("Error submitting feedback data", error);
        return { data: null, error };
    }
    debug("Feedback data synced", JSON.stringify(dbData, null, 2));
    return { data: dbData, error: null };
}

export function stripFeedbackData(data: FeedbackData): FeedbackData {
    const strippedData: FeedbackData = {
        ...data,
        ratings: { ...data.ratings },
        comments: { ...data.comments },
    };
    for (const key in strippedData.ratings) {
        if (strippedData.ratings[key] === undefined) {
            delete strippedData.ratings[key];
        }
    }
    for (const key in strippedData.comments) {
        if (strippedData.comments[key].trim() === "") {
            delete strippedData.comments[key];
        }
    }

    return strippedData;
}
