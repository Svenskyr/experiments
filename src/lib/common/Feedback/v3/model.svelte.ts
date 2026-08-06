import debugLib from "debug";

const debug = debugLib("ccg-01:Feedback:model.svelte");

import type { FeedbackData, FeedbackProps } from "./interfaces.ts";
import type { RangeSetProps } from "../../Q-RangeSet/v3/RangeSet.ts";
import { PRE_SESSION_SYNC_ERROR, submitFeedback } from "../../../_database0/UserClient.svelte.ts";

export const PRE_SESSION_SYNC_MESSAGE =
    "Your feedback has been saved locally and will sync on the next page.";

export function isPreSessionSyncError(message: string | null | undefined): boolean {
    return message === PRE_SESSION_SYNC_ERROR
        || (message?.includes("permission denied for schema exp_ccg_01") ?? false);
}

function syncErrorMessage(error: string | null): string | null {
    if (!error) return null;
    return isPreSessionSyncError(error) ? PRE_SESSION_SYNC_MESSAGE : error;
}

export const defaultFeedbackCategories = () => {
    return {
        ratings: ["Clarity", "Appropriateness"],
        comments: ["General", "Bug Report", "Suggestion", "Complaint", "Other"],
    };
};

export const defaultRangeSetProps = (fid: string, fields: string[]): RangeSetProps => {
    return {
        qid: `${fid}-ratings`,
        legendText: "Please rate the following",
        min: 0,
        max: 5,
        step: 0.5,
        tickInterval: 1,
        initialValue: 2.5,
        allowUserItems: false,
        items: fields.map((field) => ({
            itemId: field,
            nameLabel: field,
            displayOrder: fields.indexOf(field),
        })),
    };
};

export class FeedbackModel {
    readonly fid: string;
    readonly parentName: string;
    readonly targetName: string;
    ratings: Record<string, number | null> = $state({});
    comments: Record<string, string> = $state({});
    synced: boolean = $state(false);
    syncing: boolean = $state(false);
    syncError: string | null = $state(null);

    constructor(props: FeedbackProps) {
        this.parentName = props.parentName;
        this.targetName = props.targetName;
        this.fid = `${normalizeString(this.parentName)}:feedback:${
            normalizeString(this.targetName)
        }`;
        const hadStoredState = localStorage.getItem(this.storageKey) !== null;
        this.restoreLocalState();
        if (!this.hasAnyFeedback) {
            defaultFeedbackCategories().ratings.forEach((item) => {
                this.ratings[item] = null;
            });
            defaultFeedbackCategories().comments.forEach((item) => {
                this.comments[item] = "";
            });
        }
        if (!hadStoredState || !this.hasAnyFeedback) {
            this.synced = true;
        }
        this.syncing = false;
    }

    get storageKey(): string {
        return `${this.parentName}:feedback:${this.targetName}`;
    }

    get hasAnyFeedback(): boolean {
        return Object.values(this.ratings).some((rating) => rating !== null)
            || Object.values(this.comments).some((comment) => comment && comment.trim() !== "");
    }

    storeLocalState() {
        if (!this.hasAnyFeedback) return;
        localStorage.setItem(
            this.storageKey,
            JSON.stringify({
                ratings: this.ratings,
                comments: this.comments,
                synced: this.synced,
                syncing: this.syncing,
                syncError: this.syncError,
            }),
        );
    }

    restoreLocalState() {
        const data = localStorage.getItem(this.storageKey);
        if (data) {
            try {
                const parsedData = JSON.parse(data) as FeedbackData;
                if (!parsedData) return;
                this.ratings = parsedData.ratings;
                this.comments = parsedData.comments;
                this.synced = parsedData.synced;
                this.syncing = parsedData.syncing;
                this.syncError = parsedData.syncError;
            } catch (error) {
                console.error("Error restoring local state for feedback:", error);
            }
        }
    }

    async syncToDatabase(): Promise<{ success: boolean; error: string | null }> {
        if (this.syncing || this.synced) return Promise.resolve({ success: true, error: null });
        if (!this.hasAnyFeedback) return Promise.resolve({ success: true, error: null });
        this.syncing = true;
        this.syncError = null;

        const result = await submitFeedback({
            fid: this.fid,
            ratings: this.ratings,
            comments: this.comments,
        });
        if (result.success) {
            this.synced = true;
            this.syncing = false;
            this.syncError = null;
            this.storeLocalState();
        } else {
            this.syncError = syncErrorMessage(result.error);
            this.syncing = false;
            this.storeLocalState();
            return { success: false, error: this.syncError };
        }
        return { success: true, error: null };
    }
}

function normalizeString(str: string): string {
    return str.trim().toLowerCase().replace(/ /g, "-").replace(/[^a-z0-9-]/g, "");
}

function hasStoredFeedback(
    ratings: Record<string, number | null>,
    comments: Record<string, string>,
): boolean {
    return Object.values(ratings).some((rating) => rating !== null)
        || Object.values(comments).some((comment) => comment && comment.trim() !== "");
}

export async function syncPendingFeedback(parentName: string): Promise<void> {
    const prefix = `${parentName}:feedback:`;
    const keys = Object.keys(localStorage).filter((key) => key.startsWith(prefix));

    debug("syncPendingFeedback", keys);
    for (const key of keys) {
        debug("syncPendingFeedback", key);
        const raw = localStorage.getItem(key);
        if (!raw) continue;

        try {
            const parsed = JSON.parse(raw) as Pick<
                FeedbackData,
                "ratings" | "comments" | "synced" | "syncing" | "syncError"
            >;
            if (parsed.synced || !hasStoredFeedback(parsed.ratings, parsed.comments)) continue;

            const targetName = key.slice(prefix.length);
            const fid = `${normalizeString(parentName)}:feedback:${normalizeString(targetName)}`;
            const result = await submitFeedback({
                fid,
                ratings: parsed.ratings,
                comments: parsed.comments,
            });

            if (result.success) {
                debug("syncPendingFeedback", "success", key);
                localStorage.setItem(
                    key,
                    JSON.stringify({
                        ratings: parsed.ratings,
                        comments: parsed.comments,
                        synced: true,
                        syncing: false,
                        syncError: null,
                    }),
                );
            }
        } catch (error) {
            console.error(`Error syncing pending feedback for ${key}:`, error);
        }
    }
}
