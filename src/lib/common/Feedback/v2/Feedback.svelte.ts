import debugLib from "debug";
import type { SupabaseClient } from "@supabase/supabase-js";
import { constructRangeSet, type RangeSetProps } from "../../Q-RangeSet/v3/RangeSet.ts";
import { submitFeedback } from "../../../_database0/UserClient.svelte.ts";
import type { CommentCategory, FeedbackConfig, FeedbackData } from "./interfaces.ts";

export { defaultFeedbackConfig } from "./feedback-configs.ts";

const debug = debugLib("ccg-01:FeedbackModel");

export class FeedbackModel {
    readonly fid: string;
    readonly parentName: string;
    readonly targetName: string;
    readonly commentCategories: CommentCategory[];

    ratings: Record<string, number | null> = $state({});
    comments: Record<string, string | null> = $state({});

    private readonly _rangeSetProps: RangeSetProps;
    syncedAt: string | null = $state(null);
    modifiedAt: string | null = $state(null);
    syncing = $state(false);
    syncError: string | null = $state(null);

    constructor(config: FeedbackConfig) {
        this.fid = config.fid;
        this.parentName = config.parentName;
        this.targetName = config.targetName;
        this.commentCategories = config.commentCategories;

        this._rangeSetProps = constructRangeSet({
            ...config.ratings,
            qid: `${config.fid}-ratings`,
        });

        for (const item of this._rangeSetProps.items) {
            this.ratings[item.itemId] = null;
        }
        for (const category of this.commentCategories) {
            this.comments[category.categoryId] = null;
        }

        this.restoreClientState();
    }

    get storageKey(): string {
        return `${this.parentName}:feedback:${this.targetName}`;
    }

    get rangeSetProps(): RangeSetProps {
        return this._rangeSetProps;
    }

    get hasComments(): boolean {
        for (const categoryId of Object.keys(this.comments)) {
            const text = this.comments[categoryId];
            if (text && text.trim() !== "") {
                return true;
            }
        }
        return false;
    }

    get hasData(): boolean {
        for (const value of Object.values(this.ratings)) {
            if (value !== null) {
                return true;
            }
        }
        return this.hasComments;
    }

    get needsSync(): boolean {
        if (!this.hasData) {
            return false;
        }
        return !this.syncedAt || (this.modifiedAt !== null && this.modifiedAt > this.syncedAt);
    }

    get isSynced(): boolean {
        return !!this.syncedAt && !this.needsSync;
    }

    private touch() {
        this.modifiedAt = new Date().toISOString();
    }

    onRatingsCommit(values: Record<string, number | null>) {
        for (const [itemId, value] of Object.entries(values)) {
            if (itemId in this.ratings) {
                this.ratings[itemId] = value;
            }
        }
        this.touch();
        this.storeClientState();
    }

    setComment(categoryId: string, text: string) {
        if (!(categoryId in this.comments)) {
            return;
        }
        this.comments[categoryId] = text;
        this.touch();
        this.storeClientState();
    }

    storeClientState() {
        const data = this.dehydrate();
        debug("storing client state for %s: %s", this.targetName, JSON.stringify(data));
        localStorage.setItem(this.storageKey, JSON.stringify(data));
    }

    restoreClientState() {
        let migrated = false;
        let data: FeedbackData | null = null;

        const raw = localStorage.getItem(this.storageKey);
        if (raw) {
            try {
                data = JSON.parse(raw) as FeedbackData;
            } catch (error) {
                debug("error parsing feedback data for %s: %s", this.targetName, error);
            }
        }

        if (data?.syncedAt !== undefined) {
            this.syncedAt = data.syncedAt;
        }

        if (data?.data?.ratings) {
            for (const [itemId, value] of Object.entries(data.data.ratings)) {
                if (itemId in this.ratings) {
                    this.ratings[itemId] = value;
                }
            }
        }

        if (data?.data?.comments) {
            for (const [categoryId, value] of Object.entries(data.data.comments)) {
                if (categoryId in this.comments) {
                    this.comments[categoryId] = value;
                }
            }
        }

        const hasStoredRatings = data?.data?.ratings
            && Object.keys(data.data.ratings).length > 0;
        if (!hasStoredRatings) {
            migrated = this.migrateRatingsFromRangeSetKeys();
        }

        if (migrated) {
            this.storeClientState();
        }
    }

    private migrateRatingsFromRangeSetKeys(): boolean {
        const legacyKeys = [
            this._rangeSetProps.qid,
            `${this.parentName}-${this.targetName}-ratings`,
        ];

        for (const qid of legacyKeys) {
            const raw = localStorage.getItem(qid);
            if (!raw) {
                continue;
            }

            try {
                const storedRatings = JSON.parse(raw) as Record<string, number | null>;
                let merged = false;

                for (const [itemId, value] of Object.entries(storedRatings)) {
                    if (itemId in this.ratings && value !== null) {
                        this.ratings[itemId] = value;
                        merged = true;
                    }
                }

                if (merged) {
                    debug("migrated ratings from orphaned RangeSet key %s", qid);
                    localStorage.removeItem(qid);
                    return true;
                }
            } catch (error) {
                debug("error parsing RangeSet key %s: %s", qid, error);
            }
        }

        return false;
    }

    dehydrate(): FeedbackData {
        const ratings: Record<string, number> = {};
        for (const [itemId, value] of Object.entries(this.ratings)) {
            if (value !== null) {
                ratings[itemId] = value;
            }
        }

        const comments: Record<string, string> = {};
        for (const [categoryId, value] of Object.entries(this.comments)) {
            if (value !== null && value.trim() !== "") {
                comments[categoryId] = value;
            }
        }

        const result: FeedbackData = {
            fid: this.fid,
            parentName: this.parentName,
            targetName: this.targetName,
            syncedAt: this.syncedAt,
        };

        const payload: NonNullable<FeedbackData["data"]> = {};
        if (Object.keys(ratings).length > 0) {
            payload.ratings = ratings;
        }
        if (Object.keys(comments).length > 0) {
            payload.comments = comments;
        }
        if (Object.keys(payload).length > 0) {
            result.data = payload;
        }

        return result;
    }

    async syncToDatabase(supabase: SupabaseClient): Promise<boolean> {
        if (!this.needsSync) {
            return true;
        }

        this.syncing = true;
        this.syncError = null;

        try {
            const data = this.dehydrate();
            const result = await submitFeedback(supabase, data);
            if (result === null) {
                this.syncError = "Failed to save feedback";
                return false;
            }

            this.syncedAt = new Date().toISOString();
            this.storeClientState();
            debug("synced feedback for %s at %s", this.targetName, this.syncedAt);
            return true;
        } catch (error) {
            debug("error syncing feedback for %s: %s", this.targetName, error);
            this.syncError = "Failed to save feedback";
            return false;
        } finally {
            this.syncing = false;
        }
    }

    async persist(supabase: SupabaseClient) {
        this.storeClientState();
        await this.syncToDatabase(supabase);
    }
}
