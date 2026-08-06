import debugLib from "debug";
const debug = debugLib("ccg-01:Feedback.ts");

/** Condensed interface for storing/syncing */
export interface FeedbackData {
    targetName: string; // e.g. "consent summary"
    parentName: string; // e.g. "ccg-01"
    data?: {
        ratings?: Record<string, number>;
        comments?: Record<string, string>;
    };
    syncedAt: Date | null;
}

/** Hydrated interface for displaying in the UI */
export interface FeedbackForm {
    targetName: string;
    parentName: string;
    data: {
        ratings: Record<string, number | null>;
        comments: Record<string, string | null>;
    };
    syncedAt: Date | null;
}

function hydrateDataToForm(data: FeedbackData): FeedbackForm {
    // For each data.ratings and data.comments, if not present, add the default values
    debug(data);
    return {
        targetName: data.targetName,
        parentName: data.parentName,
        data: {
            ratings: {
                "Clarity": data.data?.ratings?.["Clarity"] ?? null,
                "Appropriateness": data.data?.ratings?.["Appropriateness"] ?? null,
            } as Record<string, number | null>,
            comments: {
                "General": data.data?.comments?.["General"] ?? "",
                "Bug Report": data.data?.comments?.["Bug Report"] ?? "",
                "Suggestion": data.data?.comments?.["Suggestion"] ?? "",
                "Complaint": data.data?.comments?.["Complaint"] ?? "",
                "Other": data.data?.comments?.["Other"] ?? "",
            } as Record<string, string>,
        },
        syncedAt: null,
    };
}

function dehydrateFormToData(form: FeedbackForm): FeedbackData {
    const ratings = { ...form.data.ratings };
    for (const rating of Object.keys(ratings)) {
        if (ratings[rating] === null) {
            delete ratings[rating];
        }
    }

    const comments = { ...form.data.comments };
    for (const comment of Object.keys(comments)) {
        if (comments[comment] === null || comments[comment]?.trim() === "") {
            delete comments[comment];
        }
    }

    const data: FeedbackData = {
        targetName: form.targetName,
        parentName: form.parentName,
        syncedAt: form.syncedAt,
    };

    debug("dehydrating form to data:", form);
    debug("ratings:", ratings);
    debug("comments:", comments);

    const payload: NonNullable<FeedbackData["data"]> = {};
    if (Object.keys(ratings).length > 0) {
        payload.ratings = ratings as Record<string, number>;
    }
    if (Object.keys(comments).length > 0) {
        payload.comments = comments as Record<string, string>;
    }
    if (Object.keys(payload).length > 0) {
        data.data = payload;
    }

    return data;
}

export function getLocalFeedback(parentName: string, targetName: string): FeedbackForm {
    const feedbackData = localStorage.getItem(`${parentName}:feedback:${targetName}`);
    if (!feedbackData) return defaultFeedbackForm(targetName, parentName);
    try {
        const parsedData = JSON.parse(feedbackData) as FeedbackData;
        return hydrateDataToForm(parsedData);
    } catch (error) {
        debug("Error parsing feedback data for %s: %s", targetName, error);
        return defaultFeedbackForm(targetName, parentName);
    }
}

export function setLocalFeedback(parentName: string, targetName: string, form: FeedbackForm) {
    const data = dehydrateFormToData(form);
    debug("setting local feedback for %s: %s", targetName, JSON.stringify(data));
    localStorage.setItem(`${parentName}:feedback:${targetName}`, JSON.stringify(data));
}

export const defaultFeedbackForm = (targetName: string, parentName: string): FeedbackForm => {
    return {
        targetName,
        parentName,
        data: {
            ratings: {
                "Clarity": null,
                "Appropriateness": null,
            } as Record<string, number | null>,
            comments: {
                "General": null,
                "Bug Report": null,
                "Suggestion": null,
                "Complaint": null,
                "Other": null,
            } as Record<string, string | null>,
        },
        syncedAt: null,
    };
};
