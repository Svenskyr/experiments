import type { RangeSetProps } from "../../Q-RangeSet/v3/RangeSet.ts";

export interface CommentCategory {
    categoryId: string;
    label: string;
}

export interface FeedbackConfig {
    fid: string;
    parentName: string;
    targetName: string;
    ratings: RangeSetProps;
    commentCategories: CommentCategory[];
}

/** Condensed shape for server sync */
export interface FeedbackData {
    fid: string;
    parentName: string;
    targetName: string;
    data?: {
        ratings?: Record<string, number>;
        comments?: Record<string, string>;
    };
    syncedAt: string | null;
}

/** Per-category client state */
export interface ClientStoredComment {
    categoryId: string;
    text: string;
}
