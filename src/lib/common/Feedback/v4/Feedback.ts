import type { RangeSetQuestion } from "$lib/common/QuestionTypes/RangeSetQuestion/v4/RangeSetQuestion.ts";

export interface FeedbackData {
    page: string;
    label: string;
    ratings: Record<string, number | undefined>;
    comments: Record<string, string>;
    synced: boolean;
}

import debugLib from "debug";
const debug = debugLib("ccg-01:Feedback:v4");

function normalizeString(str: string): string {
    return str.trim().toLowerCase().replace(/ /g, "-").replace(/[^a-z0-9-]/g, "");
}

export const newFeedbackData = (page: string, label: string): FeedbackData => {
    return {
        page,
        label,
        ratings: {
            "Clarity": undefined,
            "Simplicity": undefined,
            "Appropriateness": undefined,
        },
        comments: {
            "General": "",
            "Bug Report": "",
            "Suggestion": "",
            "Complaint": "",
            "Other": "",
        },
        synced: true,
    };
};

export const ratingsRangeSet = (
    page: string,
    label: string,
    ratings: Record<string, number | undefined>,
): RangeSetQuestion => {
    return {
        qid: `${normalizeString(page)}:${normalizeString(label)}:ratings`,
        questionText: "Please rate the following",
        min: 0,
        max: 5,
        step: 0.5,
        tickInterval: 1,
        initialValue: 2.5,
        allowUserItems: false,
        required: "none",
        canonicalItems: Object.keys(ratings).map((field, i) => ({
            itemId: field,
            itemText: field,
            displayOrder: i,
            value: ratings[field],
        })),
    };
};

export function hasFeedback(data: FeedbackData): boolean {
    return Object.values(data.ratings).some((rating) => rating !== undefined)
        || Object.values(data.comments).some((comment) => comment.trim() !== "");
}

export function captureRatingsRangeSet(
    data: FeedbackData,
    rangeSet: RangeSetQuestion,
    save?: (data: FeedbackData) => void,
): void {
    const items = [...rangeSet.canonicalItems, ...(rangeSet.userItems ?? [])];
    for (const item of items) {
        data.ratings[item.itemId] = item.value;
    }
    data.synced = false;
    save?.(data);
}

export function mergeFeedbackData(data: FeedbackData, stored?: FeedbackData): FeedbackData {
    if (stored) {
        data = {
            ...data,
            ratings: { ...data.ratings, ...stored.ratings },
            comments: { ...data.comments, ...stored.comments },
        };
    }
    return data;
}
