import type { FeedbackConfig } from "./interfaces.ts";

const PARENT_NAME = "ccg-01";

export function defaultFeedbackConfig(
    parentName: string,
    targetName: string,
    fid?: string,
): FeedbackConfig {
    const resolvedFid = fid ?? `${parentName}-${targetName}`;
    return {
        fid: resolvedFid,
        parentName,
        targetName,
        ratings: {
            qid: `${resolvedFid}-ratings`,
            legendText: "Please rate the following",
            min: 0,
            max: 5,
            step: 0.5,
            tickInterval: 1,
            initialValue: 0,
            items: [
                { itemId: "Clarity", nameLabel: "Clarity", displayOrder: 1 },
                { itemId: "Appropriateness", nameLabel: "Appropriateness", displayOrder: 2 },
            ],
        },
        commentCategories: [
            { categoryId: "General", label: "General" },
            { categoryId: "Bug Report", label: "Bug Report" },
            { categoryId: "Suggestion", label: "Suggestion" },
            { categoryId: "Complaint", label: "Complaint" },
            { categoryId: "Other", label: "Other" },
        ],
    };
}
