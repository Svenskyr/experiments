import {
    loadFromLocalStorage,
    saveToLocalStorage,
    type SyncHandler,
} from "$experiments/ccg-01/_syncHandler/v3/SyncHandler.ts";

import {
    noPayloadError,
    notReadyError,
    type PostgrestError,
} from "$experiments/ccg-01/_syncHandler/v3/SyncHandlerActions.ts";

import {
    type MultipleChoiceItem,
    type MultipleChoiceQuestion,
    newMultipleChoiceQuestion,
} from "$lib/common/QuestionTypes/MultipleChoiceQuestion/v4/MultipleChoiceQuestion.ts";

import { multipleChoiceQuestions as surveyMcqs } from "../(pages)/survey/questions.ts";

const storageKey = (qid: string) => `exp_ccg_01:survey-mcq:${qid}`;
const unstorageKey = (storageKey: string) => storageKey.replace("exp_ccg_01:survey-mcq:", "");

interface storedItems {
    canonicalItems: MultipleChoiceItem[];
    userItems?: MultipleChoiceItem[];
}

export function load(qid: string): storedItems | null {
    return loadFromLocalStorage<storedItems>(storageKey(qid)) ?? null;
}

export function save(question: MultipleChoiceQuestion) {
    saveToLocalStorage<storedItems>(storageKey(question.qid), {
        canonicalItems: cleanItemsForLocalStorage(question.canonicalItems),
        userItems: question.userItems ? cleanItemsForLocalStorage(question.userItems) : undefined,
    });
}

export function sync(syncHandler: SyncHandler, qid: string): void {
    syncHandler.enqueue(storageKey(qid), "submitSurveyMultipleChoiceQuestion");
}

export async function submit(
    syncHandler: SyncHandler,
    storageKey: string,
): Promise<{ data: unknown; error: PostgrestError | null }> {
    if (!syncHandler.ready || !syncHandler.db) {
        return { data: null, error: notReadyError() };
    }
    const question = await rehydrateQuestion(storageKey);
    if (!question) {
        return { data: null, error: noPayloadError(storageKey) };
    }

    const items = [...question.canonicalItems, ...question.userItems ?? []];
    const responses = processResponses(items);
    const { data, error } = await syncHandler.db
        .schema(syncHandler.scope)
        .from("survey")
        .upsert({
            session_id: syncHandler.sessionId,
            qid: question.qid,
            question_text: question.questionText,
            question_type: "mcq",
            responses: responses,
        });
    return { data, error };
}

function cleanItemsForLocalStorage(items: MultipleChoiceItem[]): MultipleChoiceItem[] {
    return items.map((item) => ({
        itemId: item.itemId,
        itemText: item.itemText,
        isSelected: item.isSelected,
        wasSelected: item.wasSelected,
        displayOrder: item.displayOrder,
    }));
}

const byQid = new Map(
    surveyMcqs.map((q: MultipleChoiceQuestion) => [q.qid, q]),
);

function getTemplate(qid: string): MultipleChoiceQuestion | null {
    const q = byQid.get(qid);
    if (!q) return null;
    return {
        ...q,
        canonicalItems: q.canonicalItems.map((item) => ({ ...item })),
        userItems: q.userItems?.map((item) => ({ ...item })),
    };
}

async function rehydrateQuestion(
    storageKey: string,
): Promise<MultipleChoiceQuestion | null> {
    const qid = unstorageKey(storageKey);
    const template = getTemplate(qid);
    if (!template) return null;
    const storedItems = loadFromLocalStorage<storedItems>(storageKey) ?? undefined;
    return newMultipleChoiceQuestion(template, storedItems);
}

function processResponses(items: MultipleChoiceItem[]): MultipleChoiceItem[] {
    return items
        .filter((item) => item.wasSelected || item.isSelected)
        .map((item) => ({
            itemId: item.itemId,
            itemText: item.itemText,
            isSelected: item.isSelected,
            wasSelected: item.wasSelected,
            displayOrder: item.displayOrder,
        }));
}
