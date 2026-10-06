import type {
    ClozeBlankResponse,
    ClozeLineCheckPayload,
    ClozeQuestionIR,
} from "$lib/common/QuestionTypes/ClozeQuestion/v1/clozeQuestion.ts";
import {
    blankCorrectFromCheckPayload,
    type ClozeAnswerGrading,
} from "$lib/common/QuestionTypes/ClozeQuestion/v1/clozeQuestion.ts";
import * as ClozeComprehensionDBM from "./ClozeComprehensionQuestionDBM.ts";

export type ClozeFieldsetHandlerOptions = {
    grading?: ClozeAnswerGrading;
};

export function clozeFieldsetHandlers(
    question: ClozeQuestionIR,
    options: ClozeFieldsetHandlerOptions = {},
): {
    initialResponses: Record<string, ClozeBlankResponse>;
    initialCheckedBlankIds: string[];
    initialGradedResponses: Record<string, ClozeBlankResponse> | null;
    onCheckAnswers: (
        linesPayload: ClozeLineCheckPayload[],
    ) => Promise<{
        error: string | null;
        blankCorrect: Record<string, boolean>;
        updatedResponses?: Record<string, ClozeBlankResponse>;
    }>;
} {
    const grading = options.grading ?? "server";
    const stored = ClozeComprehensionDBM.load(question.qid);
    const initialCheckedBlankIds = stored
        ? grading === "local"
            ? (stored.lastCheckedBlankIds ?? [])
            : (stored.lastBlankCorrect ? Object.keys(stored.lastBlankCorrect) : [])
        : [];
    const initialResponses = stored
        ? ClozeComprehensionDBM.draftResponsesFromStorage(stored, initialCheckedBlankIds)
        : {};
    const initialGradedResponses = stored
        ? grading === "local"
            ? ClozeComprehensionDBM.gradedResponsesFromLocalCheckStorage(stored)
            : ClozeComprehensionDBM.gradedResponsesFromStorage(question, stored)
        : null;

    return {
        initialResponses,
        initialCheckedBlankIds,
        initialGradedResponses,
        async onCheckAnswers(linesPayload) {
            if (grading === "local") {
                const blankCorrect = blankCorrectFromCheckPayload(question, linesPayload);
                ClozeComprehensionDBM.saveLinesPayload(question.qid, linesPayload, {
                    lastCheckedBlankIds: Object.keys(blankCorrect),
                });
                void ClozeComprehensionDBM.submitCheck(question.qid, linesPayload, {
                    persistGradingInStorage: false,
                });
                const updated = ClozeComprehensionDBM.load(question.qid);
                return {
                    error: null,
                    blankCorrect,
                    updatedResponses: updated
                        ? ClozeComprehensionDBM.flattenResponses(updated)
                        : undefined,
                };
            }

            const { data, error } = await ClozeComprehensionDBM.submitCheck(
                question.qid,
                linesPayload,
            );
            if (error) {
                return { error: error.message, blankCorrect: {} };
            }
            const blankCorrect: Record<string, boolean> = {};
            for (const line of data!.lines) {
                Object.assign(blankCorrect, line.blankCorrect);
            }
            const updated = ClozeComprehensionDBM.load(question.qid);
            return {
                error: null,
                blankCorrect,
                updatedResponses: updated
                    ? ClozeComprehensionDBM.flattenResponses(updated)
                    : undefined,
            };
        },
    };
}
