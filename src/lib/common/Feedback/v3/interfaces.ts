export interface FeedbackProps {
    parentName: string;
    targetName: string;
}

export interface FeedbackData {
    fid: string;
    parentName: string;
    targetName: string;
    ratings: Record<string, number | null>;
    comments: Record<string, string>;
    synced: boolean;
    syncing: boolean;
    syncError: string | null;
}

export interface DatabaseFeedbackData {
    fid: string;
    ratings: Record<string, number | null>;
    comments: Record<string, string>;
}
