import {
    loadFromLocalStorage,
    saveToLocalStorage,
    SyncHandler,
} from "$exp/ccg-01/_syncHandler/v3/SyncHandler.ts";

import {
    noPayloadError,
    notReadyError,
    type PostgrestError,
} from "$exp/ccg-01/_syncHandler/v3/SyncHandlerActions.ts";

import {
    newRangeSetQuestion,
    type RangeSetItem,
    type RangeSetQuestion,
} from "$lib/common/QuestionTypes/RangeSetQuestion/v4/RangeSetQuestion.ts";

const storageKey = (qid: string) => `exp_ccg_01:rsq:${qid}`;
const unstorageKey = (storageKey: string) => storageKey.replace("exp_ccg_01:rsq:", "");

const ATTENTION_CHECK_QID = "survey-gender-norms";
const ATTENTION_CHECK_ITEM_ID = "attention-check";
const ATTENTION_CHECK_VALUE = 2.5;

interface storedItems {
    canonicalItems: RangeSetItem[];
    userItems?: RangeSetItem[];
}

export function load(qid: string): storedItems | null {
    return loadFromLocalStorage<storedItems>(storageKey(qid)) ?? null;
}

export function save(question: RangeSetQuestion) {
    saveToLocalStorage<storedItems>(storageKey(question.qid), {
        canonicalItems: cleanItemsForLocalStorage(question.canonicalItems),
        userItems: question.userItems ? cleanItemsForLocalStorage(question.userItems) : undefined,
    });
}

export function sync(syncHandler: SyncHandler, qid: string): void {
    syncHandler.enqueue(storageKey(qid), "submitRangeSetQuestion");
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
            question_type: "rsq",
            responses: responses,
        })
        .eq("session_id", syncHandler.sessionId)
        .select("session_id");
    if (!data || data.length === 0 || !data[0].session_id) {
        return {
            data: null,
            error: { message: "Session ID not found", code: "400" } as PostgrestError,
        };
    }
    if (error) {
        return { data, error };
    }

    if (question.qid === ATTENTION_CHECK_QID) {
        const attentionItem = items.find((item) => item.itemId === ATTENTION_CHECK_ITEM_ID);
        const attentionCheckCorrect = attentionItem?.value === ATTENTION_CHECK_VALUE;
        const { data: sessionData, error: sessionError } = await syncHandler.db
            .schema(syncHandler.scope)
            .from("sessions")
            .update({ attention_check_correct: attentionCheckCorrect })
            .eq("session_id", syncHandler.sessionId);
        return { data: sessionData, error: sessionError };
    }

    return { data, error: null };
}

function cleanItemsForLocalStorage(items: RangeSetItem[]): RangeSetItem[] {
    return items.map((item) => ({
        itemId: item.itemId,
        itemText: item.itemText,
        value: item.value,
        displayOrder: item.displayOrder,
    }));
}

import { rangeSetQuestions as rsqSurvey } from "../(pages)/survey/questions.ts";

const byQid = new Map(
    rsqSurvey.map((q: RangeSetQuestion) => [q.qid, q]),
);

function getTemplate(qid: string): RangeSetQuestion | null {
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
): Promise<RangeSetQuestion | null> {
    const qid = unstorageKey(storageKey);
    const template = getTemplate(qid);
    if (!template) return null;
    const storedItems = loadFromLocalStorage<storedItems>(storageKey) ?? undefined;
    const question = newRangeSetQuestion(template, storedItems);
    return question;
}

function processResponses(items: RangeSetItem[]): RangeSetItem[] {
    const responses = items.map((item) => ({
        itemId: item.itemId,
        itemText: item.itemText,
        value: item.value ?? null,
        displayOrder: item.displayOrder,
    }));

    return responses.filter((response) => response.value !== null && response.value !== undefined);
}
