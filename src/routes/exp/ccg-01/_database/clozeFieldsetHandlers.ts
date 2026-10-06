import type {
    ClozeBlankResponse,
    ClozeLineCheckPayload,
    ClozeQuestionIR,
} from "$lib/common/QuestionTypes/ClozeQuestion/v1/clozeQuestion.ts";
import {
    blankCorrectFromCheckPayload,
    type ClozeAnswerGrading,
    lineIndexForBlank,
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
    initialGradedResponses: Record<string, ClozeBlankResponse> | null;
    onSaveBlank: (blankId: string, response: ClozeBlankResponse) => void;
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
    const initialResponses = stored ? ClozeComprehensionDBM.flattenResponses(stored) : {};
    const initialGradedResponses = grading === "server" && stored
        ? ClozeComprehensionDBM.gradedResponsesFromStorage(question, stored)
        : null;

    return {
        initialResponses,
        initialGradedResponses,
        onSaveBlank(blankId, response) {
            const lineIndex = lineIndexForBlank(question, blankId);
            if (lineIndex < 0) {
                return;
            }
            ClozeComprehensionDBM.saveBlankResponse(question.qid, lineIndex, blankId, response);
        },
        async onCheckAnswers(linesPayload) {
            if (grading === "local") {
                ClozeComprehensionDBM.saveLinesPayload(question.qid, linesPayload);
                const blankCorrect = blankCorrectFromCheckPayload(question, linesPayload);
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
