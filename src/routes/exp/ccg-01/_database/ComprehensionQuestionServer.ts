import {
    mergeQuestionData,
    type MultipleChoiceItem,
    type MultipleChoiceQuestion,
} from "$lib/common/QuestionTypes/MultipleChoiceQuestion/v4/MultipleChoiceQuestion.ts";
import { multipleChoiceQuestions as gd1 } from "../(pages)/game_description_1/questions.ts";
import { multipleChoiceQuestions as gd2 } from "../(pages)/game_description_2/questions.ts";
import { supabase } from "../_database/ServiceRole.ts";
import type { PostgrestError } from "../_syncHandler/v3/SyncHandlerActions.ts";

export interface StoredItems {
    canonicalItems: MultipleChoiceItem[];
    userItems?: MultipleChoiceItem[];
}

export const comprehensionQuestionsByQid = new Map(
    [...gd1, ...gd2].map((q: MultipleChoiceQuestion) => [q.qid, q]),
);

export function getTemplate(qid: string): MultipleChoiceQuestion | null {
    const q = comprehensionQuestionsByQid.get(qid);
    if (!q) return null;
    return {
        ...q,
        canonicalItems: q.canonicalItems.map((item) => ({ ...item })),
        userItems: q.userItems?.map((item) => ({ ...item })),
    };
}

export function rehydrateQuestion(
    qid: string,
    storedItems: StoredItems,
): MultipleChoiceQuestion | null {
    const question = getTemplate(qid);
    if (!question) return null;
    return mergeQuestionData(question, storedItems);
}

export function processResponses(
    items: MultipleChoiceItem[],
): { responses: MultipleChoiceItem[]; score: number } {
    const responses = items.map((response) => ({
        itemId: response.itemId,
        itemText: response.itemText,
        isSelected: response.isSelected,
        wasSelected: response.wasSelected,
        isTrue: response.isTrue,
        displayOrder: response.displayOrder,
    }));

    const selectedResponses = responses.filter((response) => response.wasSelected);
    const trueCount = selectedResponses.filter((response) => response.isTrue === true).length;

    const score = Math.round(
        (trueCount / selectedResponses.length) * 100,
    ) / 100;

    return {
        responses,
        score,
    };
}

export async function submitComprehensionQuestion(
    sessionId: string,
    qid: string,
    storedItems: StoredItems,
): Promise<{ data: unknown; error: PostgrestError | null }> {
    const question = rehydrateQuestion(qid, storedItems);
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
    const { responses, score } = processResponses(items);

    const row = {
        session_id: sessionId,
        qid: question.qid,
        question_text: question.questionText,
        responses,
        score,
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
