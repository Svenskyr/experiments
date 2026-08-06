import {
    type MultipleChoiceItem,
    type MultipleChoiceQuestion,
} from "$lib/common/QuestionTypes/MultipleChoiceQuestion/v4/MultipleChoiceQuestion.ts";
import {
    loadFromLocalStorage,
    saveToLocalStorage,
    type SyncHandler,
} from "$exp/ccg-01/_syncHandler/v3/SyncHandler.ts";
import {
    noPayloadError,
    notReadyError,
    type PostgrestError,
} from "../_syncHandler/v3/SyncHandlerActions.ts";

interface storedItems {
    canonicalItems: MultipleChoiceItem[];
    userItems?: MultipleChoiceItem[];
}

const storageKey = (qid: string) => `exp_ccg_01:mcq:${qid}`;
const unstorageKey = (storageKey: string) => storageKey.replace("exp_ccg_01:mcq:", "");

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
    syncHandler.enqueue(storageKey(qid), "submitComprehensionQuestion");
}

export async function submit(
    syncHandler: SyncHandler,
    storageKey: string,
): Promise<{ data: unknown; error: PostgrestError | null }> {
    if (!syncHandler.ready || !syncHandler.db) {
        return { data: null, error: notReadyError() };
    }

    const storedItems = loadFromLocalStorage<storedItems>(storageKey);
    if (!storedItems) {
        return { data: null, error: noPayloadError(storageKey) };
    }

    const qid = unstorageKey(storageKey);

    let response: Response;
    try {
        response = await fetch("/experiments/ccg-01/api/comprehension", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ qid, ...storedItems }),
        });
    } catch (err) {
        return {
            data: null,
            error: {
                message: err instanceof Error ? err.message : "Network error",
                details: "",
                hint: "",
                code: "500",
            },
        };
    }

    let body: Record<string, unknown>;
    try {
        body = await response.json();
    } catch {
        return {
            data: null,
            error: {
                message: `HTTP ${response.status}`,
                details: "",
                hint: "",
                code: String(response.status),
            },
        };
    }

    if (!response.ok) {
        return {
            data: null,
            error: {
                message: typeof body.error === "string" ? body.error : `HTTP ${response.status}`,
                details: typeof body.details === "string" ? body.details : "",
                hint: typeof body.hint === "string" ? body.hint : "",
                code: typeof body.code === "string" ? body.code : String(response.status),
            },
        };
    }

    return { data: body.data, error: null };
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
