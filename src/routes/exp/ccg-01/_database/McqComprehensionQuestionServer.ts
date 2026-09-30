import {
    mergeQuestionData,
    type MultipleChoiceItem,
    type MultipleChoiceQuestion,
} from "$lib/common/QuestionTypes/MultipleChoiceQuestion/v4/MultipleChoiceQuestion.ts";
import { Log2Score } from "$lib/common/Scoring/Scoring.ts";
import { multipleChoiceQuestions as gd1 } from "../(pages)/game_description_1/questions.ts";
import { multipleChoiceQuestions as gd2 } from "../(pages)/game_description_2/questions.ts";
import { supabase } from "../_database/ServiceRole.ts";
import type { PostgrestError } from "../_syncHandler/v3/SyncHandlerActions.ts";

export interface McqStoredItems {
    canonicalItems: MultipleChoiceItem[];
    userItems?: MultipleChoiceItem[];
}

export const mcqComprehensionQuestionsByQid = new Map(
    [...gd1, ...gd2].map((q: MultipleChoiceQuestion) => [q.qid, q]),
);

export function getMcqTemplate(qid: string): MultipleChoiceQuestion | null {
    const q = mcqComprehensionQuestionsByQid.get(qid);
    if (!q) return null;
    return {
        ...q,
        canonicalItems: q.canonicalItems.map((item) => ({ ...item })),
        userItems: q.userItems?.map((item) => ({ ...item })),
    };
}

export function rehydrateMcqQuestion(
    qid: string,
    storedItems: McqStoredItems,
): MultipleChoiceQuestion | null {
    const question = getMcqTemplate(qid);
    if (!question) return null;
    return mergeQuestionData(question, storedItems);
}

function roundLog2Score(k: number, n: number): number {
    return n === 0 ? 0 : Math.round(Log2Score(k, n) * 100) / 100;
}

/** Best achievable Log2 score for this option set (minimum attempts = one per true option). */
export function maxPossibleMcqScore(items: Pick<MultipleChoiceItem, "isTrue">[]): number {
    const n = items.length;
    if (n === 0) return 0;
    const trueCount = items.filter((item) => item.isTrue === true).length;
    const kMax = trueCount > 0 ? trueCount : 1;
    return roundLog2Score(kMax, n);
}

export function processMcqResponses(
    items: MultipleChoiceItem[],
): { responses: MultipleChoiceItem[]; score: number; maxPossibleScore: number } {
    const responses = items.map((response) => ({
        itemId: response.itemId,
        itemText: response.itemText,
        isSelected: response.isSelected,
        wasSelected: response.wasSelected,
        isTrue: response.isTrue,
        displayOrder: response.displayOrder,
    }));

    const selectedResponses = responses.filter((response) => response.wasSelected);
    const k = selectedResponses.length;
    const n = responses.length;

    const score = k === 0 || n === 0 ? 0 : roundLog2Score(k, n);
    const maxPossibleScore = maxPossibleMcqScore(responses);

    return {
        responses,
        score,
        maxPossibleScore,
    };
}

export async function submitMcqComprehensionQuestion(
    sessionId: string,
    qid: string,
    storedItems: McqStoredItems,
): Promise<{ data: unknown; error: PostgrestError | null }> {
    const question = rehydrateMcqQuestion(qid, storedItems);
    if (!question) {
        return {
            data: null,
            error: {
                message: `Unknown qid: ${qid}`,
                details: "",
                hint: "",
                code: "404",
            },
        };
    }

    const items = [...question.canonicalItems, ...question.userItems ?? []];
    const { responses, score, maxPossibleScore } = processMcqResponses(items);

    const row = {
        session_id: sessionId,
        qid: question.qid,
        question_text: question.questionText,
        responses,
        score,
        max_possible_score: maxPossibleScore,
    };

    const query = supabase
        .schema("exp_ccg_01")
        .from("comprehension");

    const { data, error } = question.allowReset ? await query.upsert(row) : await query.insert(row);

    if (error) {
        return {
            data: null,
            error: {
                message: error.message,
                details: error.details ?? "",
                hint: error.hint ?? "",
                code: error.code ?? "500",
            },
        };
    }

    return { data, error: null };
}
